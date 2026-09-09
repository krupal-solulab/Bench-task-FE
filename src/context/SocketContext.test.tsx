import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { queryKeys } from '@/lib/constants'
import { mockUsers } from '@/test/mocks/fixtures'

type SocketHandler = (payload: unknown) => void

const fakeSocket = {
  on: vi.fn<(event: string, handler: SocketHandler) => void>(),
  emit: vi.fn(),
  disconnect: vi.fn(),
}
const ioMock = vi.fn((..._args: unknown[]) => fakeSocket)

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}))

// Imported after the mock so SocketContext picks up the mocked `io`.
const { SocketProvider } = await import('@/context/SocketContext')
const { useSocket } = await import('@/hooks/useSocket')

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: mockUsers[0] ?? null,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function TestConsumer({ onReady }: { onReady: (ctx: ReturnType<typeof useSocket>) => void }) {
  const ctx = useSocket()
  onReady(ctx)
  return null
}

function renderSocketTree(
  authValue: AuthContextValue,
  onReady: (ctx: ReturnType<typeof useSocket>) => void,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <SocketProvider>
            <TestConsumer onReady={onReady} />
          </SocketProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
  }
}

function getHandler(event: string): SocketHandler {
  const call = fakeSocket.on.mock.calls.find(([name]) => name === event)
  if (!call) throw new Error(`no handler registered for "${event}"`)
  return call[1] as SocketHandler
}

describe('SocketProvider', () => {
  beforeEach(() => {
    ioMock.mockClear()
    fakeSocket.on.mockClear()
    fakeSocket.emit.mockClear()
    fakeSocket.disconnect.mockClear()
  })

  it('opens a connection when the user is authenticated', () => {
    renderSocketTree(makeAuthValue({ isAuthenticated: true }), () => {})
    expect(ioMock).toHaveBeenCalledTimes(1)
  })

  it('never opens a connection when the user is not authenticated', () => {
    renderSocketTree(makeAuthValue({ isAuthenticated: false }), () => {})
    expect(ioMock).not.toHaveBeenCalled()
  })

  it('disconnects the socket when the user logs out', () => {
    let setAuthenticated: ((value: boolean) => void) | undefined
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    function Harness() {
      const [authed, setAuthed] = useState(true)
      setAuthenticated = setAuthed
      return (
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={makeAuthValue({ isAuthenticated: authed })}>
            <SocketProvider>
              <div />
            </SocketProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    }

    render(<Harness />)
    expect(ioMock).toHaveBeenCalledTimes(1)

    act(() => setAuthenticated?.(false))
    expect(fakeSocket.disconnect).toHaveBeenCalled()
  })

  it('joinProject/leaveProject emit the corresponding socket events', () => {
    let ctx: ReturnType<typeof useSocket> | undefined
    renderSocketTree(makeAuthValue(), (c) => {
      ctx = c
    })

    ctx?.joinProject('project-1')
    expect(fakeSocket.emit).toHaveBeenCalledWith('join:project', 'project-1')

    ctx?.leaveProject('project-1')
    expect(fakeSocket.emit).toHaveBeenCalledWith('leave:project', 'project-1')
  })

  it('invalidates task and dashboard caches on a task:statusChanged event', async () => {
    const { queryClient } = renderSocketTree(makeAuthValue(), () => {})
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const handler = getHandler('task:statusChanged')
    handler({
      taskId: 't-1',
      projectId: 'p-1',
      fromStatus: 'Todo',
      toStatus: 'In Progress',
      actorId: 'u-1',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('t-1') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.all })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.projects.detail('p-1') })
    })
  })

  it('invalidates the comments cache on a comment:created event', async () => {
    const { queryClient } = renderSocketTree(makeAuthValue(), () => {})
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const handler = getHandler('comment:created')
    handler({ taskId: 't-1', projectId: 'p-1', commentId: 'c-1', authorId: 'u-1' })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['comments', 't-1'] })
    })
  })
})
