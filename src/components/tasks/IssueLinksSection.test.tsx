import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { IssueLinksSection } from '@/components/tasks/IssueLinksSection'
import type { IssueLink, LinkType } from '@/types/issue-link.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const DEFAULT_LINK_TYPES: LinkType[] = [
  { id: 'blocks', name: 'Blocks', inverseName: 'Is Blocked By', isBlocking: true },
  { id: 'relates-to', name: 'Relates To', inverseName: 'Relates To', isBlocking: false },
]

function mockLinkTypes(types: LinkType[] = DEFAULT_LINK_TYPES) {
  server.use(http.get(url('/link-types'), () => HttpResponse.json({ success: true, data: types })))
}

function mockLinks(links: IssueLink[]) {
  server.use(
    http.get(url('/tasks/:taskId/links'), () => HttpResponse.json({ success: true, data: links })),
  )
}

function renderSection(canManage = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<IssueLinksSection taskId="task-1" canManage={canManage} />, { wrapper: Wrapper })
}

describe('IssueLinksSection', () => {
  it('shows an empty state when there are no links', async () => {
    mockLinkTypes()
    mockLinks([])
    renderSection()

    expect(await screen.findByText('No linked issues yet.')).toBeInTheDocument()
  })

  it('lists existing links resolved by direction', async () => {
    mockLinkTypes()
    mockLinks([
      {
        id: 'link-1',
        linkTypeId: 'blocks',
        linkTypeName: 'Is Blocked By',
        direction: 'incoming',
        task: {
          id: 'task-2',
          issueKey: 'PRJ-2',
          title: 'Upstream work',
          status: 'Todo',
          statusCategory: 'To Do',
          project: { id: 'p-1', name: 'Project A' },
        },
      },
    ])
    renderSection()

    expect(await screen.findByText('Upstream work')).toBeInTheDocument()
    expect(screen.getByText('Is Blocked By')).toBeInTheDocument()
    expect(screen.getByText('PRJ-2')).toBeInTheDocument()
  })

  it('hides the quick-add row when canManage is false', async () => {
    mockLinkTypes()
    mockLinks([])
    renderSection(false)

    await screen.findByText('No linked issues yet.')
    expect(screen.queryByPlaceholderText('Search issues to link…')).not.toBeInTheDocument()
  })

  it('searches, picks, and creates a link', async () => {
    mockLinkTypes()
    mockLinks([])
    server.use(
      http.get(url('/tasks/search'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'task-9',
              issueKey: 'PRJ-9',
              title: 'Matched task',
              project: { id: 'p-1', name: 'Project A' },
            },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      ),
    )
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/tasks/task-1/links'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 'link-new',
              linkTypeId: createdBody.linkTypeId,
              linkTypeName: 'Blocks',
              direction: 'outgoing',
              task: {
                id: 'task-9',
                issueKey: 'PRJ-9',
                title: 'Matched task',
                status: 'Todo',
                statusCategory: 'To Do',
                project: { id: 'p-1', name: 'Project A' },
              },
            },
          },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await screen.findByText('No linked issues yet.')
    await user.type(screen.getByPlaceholderText('Search issues to link…'), 'Matched')

    const option = await screen.findByText('Matched task')
    await user.click(option)

    await user.click(screen.getByRole('button', { name: 'Link' }))

    await waitFor(() => expect(createdBody).not.toBeNull())
    expect(createdBody).toMatchObject({ targetTaskId: 'task-9', linkTypeId: 'blocks' })
  })

  it('removes an existing link', async () => {
    mockLinkTypes()
    mockLinks([
      {
        id: 'link-1',
        linkTypeId: 'relates-to',
        linkTypeName: 'Relates To',
        direction: 'outgoing',
        task: {
          id: 'task-2',
          issueKey: 'PRJ-2',
          title: 'Related work',
          status: 'Todo',
          statusCategory: 'To Do',
          project: { id: 'p-1', name: 'Project A' },
        },
      },
    ])
    let removed = false
    server.use(
      http.delete(url('/tasks/task-1/links/link-1'), () => {
        removed = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Related work')
    await user.click(screen.getByLabelText('Remove link to PRJ-2'))

    await waitFor(() => expect(removed).toBe(true))
  })
})
