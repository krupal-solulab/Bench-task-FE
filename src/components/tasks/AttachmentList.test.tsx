import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { AttachmentList } from '@/components/tasks/AttachmentList'
import type { Attachment } from '@/types/attachment.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const TASK_ID = 't-1'

const UPLOADER = mockUsers[2]! // Dev One
const OTHER_DEV = mockUsers[3]! // Dev Two
const ADMIN = mockUsers[0]! // Ada Admin
const MANAGER = mockUsers[1]! // Mona Manager

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'a-1',
    taskId: TASK_ID,
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    uploadedBy: UPLOADER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function mockAttachmentsList(attachments: Attachment[]) {
  server.use(
    http.get(url(`/tasks/${TASK_ID}/attachments`), () =>
      HttpResponse.json({
        success: true,
        data: attachments,
        meta: {
          total: attachments.length,
          page: 1,
          limit: 50,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: UPLOADER,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function renderList(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<AttachmentList taskId={TASK_ID} />, { wrapper: Wrapper })
}

describe('AttachmentList', () => {
  it('shows the delete control to the uploader', async () => {
    mockAttachmentsList([makeAttachment({ uploadedBy: UPLOADER })])
    renderList(makeAuthValue({ user: UPLOADER }))

    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument())
    expect(screen.getByLabelText('Delete report.pdf')).toBeInTheDocument()
  })

  it('shows the delete control to an Admin who did not upload the file', async () => {
    mockAttachmentsList([makeAttachment({ uploadedBy: UPLOADER })])
    renderList(makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }))

    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument())
    expect(screen.getByLabelText('Delete report.pdf')).toBeInTheDocument()
  })

  it('shows the delete control to a Manager who did not upload the file', async () => {
    mockAttachmentsList([makeAttachment({ uploadedBy: UPLOADER })])
    renderList(makeAuthValue({ user: MANAGER, hasRole: (...roles) => roles.includes('Manager') }))

    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument())
    expect(screen.getByLabelText('Delete report.pdf')).toBeInTheDocument()
  })

  it('hides the delete control from another Developer who did not upload the file', async () => {
    mockAttachmentsList([makeAttachment({ uploadedBy: UPLOADER })])
    renderList(makeAuthValue({ user: OTHER_DEV }))

    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument())
    expect(screen.queryByLabelText('Delete report.pdf')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no attachments', async () => {
    mockAttachmentsList([])
    renderList(makeAuthValue())

    await waitFor(() => expect(screen.getByText('No attachments')).toBeInTheDocument())
  })
})
