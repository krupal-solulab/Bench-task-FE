import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockComments, mockUsers } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/constants'
import type { Paginated } from '@/services/api-client'
import { useCreateComment, useDeleteComment } from '@/hooks/mutations/useCommentMutations'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import type { Comment } from '@/types/comment.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const TASK_ID = 't-1'

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: mockUsers[2] ?? null,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function makeWrapper(queryClient: QueryClient, authValue: AuthContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    )
  }
}

function commentListKey() {
  return queryKeys.comments.list(TASK_ID, { page: 1, limit: 20, sortOrder: 'desc' as const })
}

describe('useCreateComment', () => {
  it('optimistically prepends a temp comment, then replaces it with the server response', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const listKey = commentListKey()
    const existing: Paginated<Comment> = {
      data: [mockComments[0] as Comment],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    }
    queryClient.setQueryData(listKey, existing)

    let resolveResponse: (() => void) | undefined
    server.use(
      http.post(url(`/tasks/${TASK_ID}/comments`), async () => {
        await new Promise<void>((resolve) => {
          resolveResponse = resolve
        })
        return HttpResponse.json({
          success: true,
          data: {
            id: 'c-new',
            taskId: TASK_ID,
            body: 'A brand new comment',
            author: mockUsers[2],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      }),
    )

    const { result } = renderHook(() => useCreateComment(TASK_ID), {
      wrapper: makeWrapper(queryClient, makeAuthValue()),
    })

    result.current.mutate({ body: 'A brand new comment' })

    await waitFor(() => {
      const data = queryClient.getQueryData<Paginated<Comment>>(listKey)
      expect(data?.data).toHaveLength(2)
      expect(data?.data[0]?.id).toMatch(/^temp-/)
    })

    resolveResponse?.()

    await waitFor(() => {
      const data = queryClient.getQueryData<Paginated<Comment>>(listKey)
      expect(data?.data[0]?.id).toBe('c-new')
    })
  })

  it('removes the optimistic comment if the server rejects the request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const listKey = commentListKey()
    const existing: Paginated<Comment> = {
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }
    queryClient.setQueryData(listKey, existing)

    server.use(
      http.post(url(`/tasks/${TASK_ID}/comments`), () =>
        HttpResponse.json(
          {
            statusCode: 403,
            message: 'You must be a member of this project to comment',
            error: 'Forbidden',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 403 },
        ),
      ),
    )

    const { result } = renderHook(() => useCreateComment(TASK_ID), {
      wrapper: makeWrapper(queryClient, makeAuthValue()),
    })

    result.current.mutate({ body: 'This will fail' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = queryClient.getQueryData<Paginated<Comment>>(listKey)
    expect(data?.data).toHaveLength(0)
  })
})

describe('useDeleteComment', () => {
  it('removes the comment from every matching cached page on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const listKey = commentListKey()
    const comment = mockComments[0] as Comment
    queryClient.setQueryData(listKey, {
      data: [comment],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    })

    server.use(
      http.delete(url(`/comments/${comment.id}`), () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    )

    const { result } = renderHook(() => useDeleteComment(TASK_ID), {
      wrapper: makeWrapper(queryClient, makeAuthValue()),
    })

    result.current.mutate(comment.id)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = queryClient.getQueryData<Paginated<Comment>>(listKey)
    expect(data?.data).toHaveLength(0)
    expect(data?.meta.total).toBe(0)
  })
})
