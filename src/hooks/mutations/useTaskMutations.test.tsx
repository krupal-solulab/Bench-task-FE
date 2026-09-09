import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockTasks } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/constants'
import { useUpdateAnyTaskStatus, useUpdateTaskStatus } from '@/hooks/mutations/useTaskMutations'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateTaskStatus', () => {
  it('optimistically updates the cached task before the server responds', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const task = mockTasks[0] as Task
    queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

    let resolveResponse: (() => void) | undefined
    server.use(
      http.patch(url(`/tasks/${task.id}/status`), async () => {
        await new Promise<void>((resolve) => {
          resolveResponse = resolve
        })
        return HttpResponse.json({ success: true, data: { ...task, status: 'Review' } })
      }),
    )

    const { result } = renderHook(() => useUpdateTaskStatus(task.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate('Review')

    await waitFor(() => {
      expect(queryClient.getQueryData<Task>(queryKeys.tasks.detail(task.id))?.status).toBe('Review')
    })

    resolveResponse?.()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('rolls back the optimistic update when the server rejects the change', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const task = mockTasks[0] as Task
    queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

    server.use(
      http.patch(url(`/tasks/${task.id}/status`), () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'Illegal transition',
            error: 'Conflict',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 409 },
        ),
      ),
    )

    const { result } = renderHook(() => useUpdateTaskStatus(task.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate('Done')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<Task>(queryKeys.tasks.detail(task.id))?.status).toBe(
      task.status,
    )
  })
})

describe('useUpdateAnyTaskStatus', () => {
  it('updates the correct task cache entry given an id supplied at call time', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const task = mockTasks[1] as Task
    queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

    server.use(
      http.patch(url(`/tasks/${task.id}/status`), () =>
        HttpResponse.json({ success: true, data: { ...task, status: 'In Progress' } }),
      ),
    )

    const { result } = renderHook(() => useUpdateAnyTaskStatus(), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ id: task.id, status: 'In Progress' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData<Task>(queryKeys.tasks.detail(task.id))?.status).toBe(
      'In Progress',
    )
  })
})
