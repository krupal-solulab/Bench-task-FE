import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { SubtaskChecklist } from '@/components/tasks/SubtaskChecklist'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockSubtasks(
  subtasks: Array<{
    id: string
    title: string
    status: string
    statusCategory?: string
    issueKey: string | null
  }>,
) {
  server.use(
    http.get(url('/projects/:id/tasks'), () =>
      HttpResponse.json({
        success: true,
        data: subtasks,
        meta: {
          total: subtasks.length,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function renderChecklist(canManage = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<SubtaskChecklist parentTaskId="story-1" projectId="p-1" canManage={canManage} />, {
    wrapper: Wrapper,
  })
}

describe('SubtaskChecklist', () => {
  it('shows an empty state when there are no sub-tasks', async () => {
    mockSubtasks([])
    renderChecklist()

    expect(await screen.findByText('No sub-tasks yet.')).toBeInTheDocument()
  })

  it('lists fetched sub-tasks with their status and a done/total summary', async () => {
    mockSubtasks([
      {
        id: 'sub-1',
        title: 'Write tests',
        status: 'Done',
        statusCategory: 'Done',
        issueKey: 'PRJ-2',
      },
      {
        id: 'sub-2',
        title: 'Write docs',
        status: 'Todo',
        statusCategory: 'To Do',
        issueKey: 'PRJ-3',
      },
    ])
    renderChecklist()

    expect(await screen.findByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('Write docs')).toBeInTheDocument()
    expect(screen.getByText('1/2 done')).toBeInTheDocument()
  })

  it('hides the quick-add row when canManage is false', async () => {
    mockSubtasks([])
    renderChecklist(false)

    await screen.findByText('No sub-tasks yet.')
    expect(screen.queryByPlaceholderText('Add a sub-task…')).not.toBeInTheDocument()
  })

  it('creates a new sub-task via the quick-add row', async () => {
    mockSubtasks([])
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/tasks'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { id: 'sub-new', title: createdBody.title } },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderChecklist()

    const input = await screen.findByPlaceholderText('Add a sub-task…')
    await user.type(input, 'New sub-task')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(createdBody).not.toBeNull())
    expect(createdBody).toMatchObject({
      title: 'New sub-task',
      project: 'p-1',
      issueType: 'Sub-task',
      parent: 'story-1',
    })
  })
})
