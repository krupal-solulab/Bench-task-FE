import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { ImportExportPanel } from '@/components/projects/ImportExportPanel'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const PROJECT_ID = 'p-1'

function renderPanel(canManage = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<ImportExportPanel projectId={PROJECT_ID} canManage={canManage} />, {
    wrapper: Wrapper,
  })
}

describe('ImportExportPanel (Module 5 - Bulk Operations & Import/Export)', () => {
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    clickSpy = vi.fn()
    HTMLAnchorElement.prototype.click = clickSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows only Export CSV when canManage is false', () => {
    renderPanel(false)
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import CSV' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download backup' })).not.toBeInTheDocument()
  })

  it('exports CSV content and triggers a client-side download', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/tasks/export`), () =>
        HttpResponse.json({
          success: true,
          data: { filename: 'proj-tasks.csv', csv: 'title\nA task' },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1))
  })

  it('imports a CSV file and reports per-row success/failure', async () => {
    server.use(
      http.post(url(`/projects/${PROJECT_ID}/tasks/import`), () =>
        HttpResponse.json({
          success: true,
          data: {
            succeeded: [{ row: 2, issueKey: 'PRJ-1', taskId: 't-1' }],
            failed: [{ row: 3, message: 'Missing title' }],
          },
        }),
      ),
    )
    const user = userEvent.setup()
    const { container } = renderPanel()

    const csvContent = 'title\nTask A\n'
    const file = new File([csvContent], 'tasks.csv', { type: 'text/csv' })
    // jsdom's File/Blob has no working `.text()` implementation - stub it for this test only
    // (a standard, universally-supported browser API in real environments).
    file.text = vi.fn().mockResolvedValue(csvContent)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByText('1 succeeded, 1 failed')).toBeInTheDocument()
    expect(screen.getByText('Row 3: Missing title')).toBeInTheDocument()
  })

  it('downloads a project backup as JSON', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/backup`), () =>
        HttpResponse.json({
          success: true,
          data: { filename: 'proj-backup.json', backup: { project: { name: 'Proj' }, tasks: [] } },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Download backup' }))

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1))
  })
})
