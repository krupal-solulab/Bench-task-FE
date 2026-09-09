import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/constants'
import type { Paginated } from '@/services/api-client'
import { useDeleteAttachment, useUploadAttachment } from '@/hooks/mutations/useAttachmentMutations'
import type { Attachment } from '@/types/attachment.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const TASK_ID = 't-1'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function attachmentListKey() {
  return queryKeys.attachments.list(TASK_ID, { page: 1, limit: 50 })
}

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'a-1',
    taskId: TASK_ID,
    filename: 'notes.txt',
    mimeType: 'text/plain',
    size: 22,
    uploadedBy: mockUsers[2]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useUploadAttachment', () => {
  it('prepends the newly-uploaded attachment to the cached list on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const listKey = attachmentListKey()
    queryClient.setQueryData(listKey, {
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    })

    const uploaded = makeAttachment({ id: 'a-new', filename: 'report.pdf' })
    server.use(
      http.post(url(`/tasks/${TASK_ID}/attachments`), () =>
        HttpResponse.json({ success: true, data: uploaded }),
      ),
    )

    const { result } = renderHook(() => useUploadAttachment(TASK_ID), {
      wrapper: makeWrapper(queryClient),
    })

    const file = new File(['hello'], 'report.pdf', { type: 'application/pdf' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = queryClient.getQueryData<Paginated<Attachment>>(listKey)
    expect(data?.data[0]?.id).toBe('a-new')
    expect(data?.meta.total).toBe(1)
  })

  it('surfaces a rejected upload (e.g. blocked file type) as a mutation error', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    server.use(
      http.post(url(`/tasks/${TASK_ID}/attachments`), () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'File type ".exe" is not allowed',
            error: 'Bad Request',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useUploadAttachment(TASK_ID), {
      wrapper: makeWrapper(queryClient),
    })

    const file = new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDeleteAttachment', () => {
  it('removes the attachment from the cached list on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const listKey = attachmentListKey()
    const attachment = makeAttachment()
    queryClient.setQueryData(listKey, {
      data: [attachment],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    })

    server.use(
      http.delete(url(`/attachments/${attachment.id}`), () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    )

    const { result } = renderHook(() => useDeleteAttachment(TASK_ID), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate(attachment.id)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = queryClient.getQueryData<Paginated<Attachment>>(listKey)
    expect(data?.data).toHaveLength(0)
  })
})
