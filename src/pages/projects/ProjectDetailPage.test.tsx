import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockProjects, mockUsers } from '@/test/mocks/fixtures'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { NO_MEMBER_PERMISSIONS, type MemberPermissions } from '@/types/project.types'

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ joinProject: vi.fn(), leaveProject: vi.fn() }),
}))

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const ADMIN = mockUsers[0]! // Ada Admin
const MANAGER = mockUsers[1]! // Mona Manager - owns project p-1
const DEV_ONE = mockUsers[2]! // Dev One - a project member of p-1
const OTHER_DEV = mockUsers[3]! // Dev Two - a project member, not the owner

/** Overrides GET /projects/p-1 so the given member has a specific per-project grant (Phase 3). */
function withMemberPermissions(userId: string, permissions: Partial<MemberPermissions>) {
  server.use(
    http.get(url('/projects/p-1'), () => {
      const project = mockProjects.find((p) => p.id === 'p-1')!
      return HttpResponse.json({
        success: true,
        data: {
          ...project,
          members: project.members.map((m) =>
            m.user.id === userId
              ? { ...m, permissions: { ...NO_MEMBER_PERMISSIONS, ...permissions } }
              : m,
          ),
        },
      })
    }),
  )
}

beforeEach(() => {
  server.use(
    http.get(url('/projects/:id/stats'), () =>
      HttpResponse.json({
        success: true,
        data: {
          totalTasks: 2,
          tasksByStatus: {},
          tasksByPriority: {},
          overdueCount: 0,
          completionRate: 50,
        },
      }),
    ),
  )
})

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: ADMIN,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

/** Exposes the router's current search string so a test can assert on it (MemoryRouter never
 * touches the real window.location, so that's not observable directly). */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{location.search}</div>
}

function renderProjectDetail(authValue: AuthContextValue, initialEntry = '/projects/p-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>
              {children}
              <LocationProbe />
            </AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('ProjectDetailPage', () => {
  it('renders the project name and owner, and shows Edit/Delete for an Admin', async () => {
    renderProjectDetail(
      makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
    )

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByText('Mona Manager', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows Edit/Delete for the owning Manager', async () => {
    renderProjectDetail(
      makeAuthValue({ user: MANAGER, hasRole: (...roles) => roles.includes('Manager') }),
    )
    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('hides Edit/Delete from a member Developer who does not own the project', async () => {
    renderProjectDetail(makeAuthValue({ user: OTHER_DEV, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Task' })).not.toBeInTheDocument()
  })

  it('a Developer member with a canCreateTask grant sees New Task but not New Sprint (Phase 3)', async () => {
    withMemberPermissions(DEV_ONE.id, { canCreateTask: true })
    renderProjectDetail(makeAuthValue({ user: DEV_ONE, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'New Task' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Sprint' })).not.toBeInTheDocument()
  })

  it('a Developer member with a canManageSprints grant sees New Sprint but not New Task (Phase 3)', async () => {
    withMemberPermissions(DEV_ONE.id, { canManageSprints: true })
    renderProjectDetail(makeAuthValue({ user: DEV_ONE, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'New Sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Task' })).not.toBeInTheDocument()
  })

  it('a Developer member with no grant sees neither New Task nor New Sprint (regression)', async () => {
    renderProjectDetail(makeAuthValue({ user: DEV_ONE, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'New Task' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Sprint' })).not.toBeInTheDocument()
  })

  it('switches to the Members tab and shows project members', async () => {
    const user = userEvent.setup()
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: 'Members' }))

    expect(await screen.findAllByText('Mona Manager')).not.toHaveLength(0)
  })

  it('shows the task board with fetched tasks by default', async () => {
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(await screen.findByText('Design homepage hero')).toBeInTheDocument()
  })

  it('scopes the Board task list to Story/Task/Bug (regression: Epics and Sub-tasks must not clutter the Board/Backlog)', async () => {
    // Board/Backlog/Sprint Board/Epics all query this same endpoint in parallel on mount, so
    // collect every request seen rather than relying on which one happens to resolve last.
    const seenQueries: string[] = []
    server.use(
      http.get(url('/projects/:id/tasks'), ({ request }) => {
        seenQueries.push(new URL(request.url).search)
        return HttpResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      }),
    )
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await waitFor(() => {
      const standardIssueQuery = seenQueries.find(
        (q) => q.includes('Story') && q.includes('Task') && q.includes('Bug'),
      )
      expect(standardIssueQuery).toBeDefined()
    })
  })

  it('clicking "My issues" filters the board to the current user, and the URL reflects it (Phase 2 gap-closure)', async () => {
    const seenAssignees: Array<string | null> = []
    server.use(
      http.get(url('/projects/:id/tasks'), ({ request }) => {
        seenAssignees.push(new URL(request.url).searchParams.get('assignee'))
        return HttpResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'My issues' }))

    await waitFor(() => expect(seenAssignees).toContain(ADMIN.id))
    expect(screen.getByTestId('location-probe')).toHaveTextContent(`assignee=${ADMIN.id}`)
  })

  it('hides the Backlog/Sprint Board/Calendar tabs for a Kanban project (Phase 2 gap-closure - BRD 6.3)', async () => {
    server.use(
      http.get(url('/projects/p-1'), () => {
        const project = mockProjects.find((p) => p.id === 'p-1')!
        return HttpResponse.json({ success: true, data: { ...project, boardType: 'Kanban' } })
      }),
    )
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Board' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Backlog' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Sprint Board' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Calendar' })).not.toBeInTheDocument()
  })

  it('opens directly to the tab named in the URL (regression: a refresh on any non-Board tab used to always bounce back to Board)', async () => {
    renderProjectDetail(makeAuthValue(), '/projects/p-1?tab=members')

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findAllByText('Mona Manager')).not.toHaveLength(0)
  })

  it('updates the URL when switching tabs, so a refresh would reopen the same tab', async () => {
    const user = userEvent.setup()
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))

    expect(screen.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('location-probe')).toHaveTextContent('tab=calendar')
  })

  it('shows a Start sprint button for a Planned sprint on the Backlog tab (regression: there was previously no way to start a sprint from the UI)', async () => {
    server.use(
      http.get(url('/projects/:id/sprints'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 's-1',
              name: 'Sprint 1',
              goal: '',
              project: 'p-1',
              status: 'Planned',
              startDate: '2026-01-01',
              endDate: '2026-01-14',
              startedAt: null,
              completedAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 100,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderProjectDetail(
      makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
    )

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: 'Backlog' }))

    expect(await screen.findByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start sprint' })).toBeInTheDocument()
  })

  describe('Workflow tab (Workflow Engine v2)', () => {
    const DEFAULT_WORKFLOW_BODY = {
      statuses: [
        { name: 'Todo', category: 'To Do' },
        { name: 'Done', category: 'Done' },
      ],
      transitions: [{ from: 'Todo', to: 'Done' }],
      initialStatus: 'Todo',
    }

    beforeEach(() => {
      server.use(
        http.get(url('/projects/:id/workflow'), () =>
          HttpResponse.json({ success: true, data: DEFAULT_WORKFLOW_BODY }),
        ),
        http.get(url('/workflow-templates'), () => HttpResponse.json({ success: true, data: [] })),
      )
    })

    // Opening a Radix Select's dropdown (to assert on its listed <option> items) reliably hangs
    // under userEvent in this jsdom+vitest environment - a documented limitation from earlier in
    // this project (see WorkflowSettingsForm/IssueTypesSettingsForm's own tests, which likewise
    // never open a Select to enumerate its options). These tests stick to the selector's default
    // rendered value and to plain button clicks (the List/Visual toggle), never opening the menu.
    it('shows an issue-type selector defaulting to "Default (project-wide)", and a List/Visual toggle defaulting to List', async () => {
      renderProjectDetail(
        makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
        '/projects/p-1?tab=workflow',
      )

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      expect(await screen.findByText('Default (project-wide)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save workflow' })).toBeInTheDocument()
      expect(screen.queryByTestId('workflow-canvas')).not.toBeInTheDocument()
    })

    it('switches to the Visual view and shows the workflow canvas', async () => {
      const user = userEvent.setup()
      renderProjectDetail(
        makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
        '/projects/p-1?tab=workflow',
      )

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      await screen.findByText('Default (project-wide)')
      await user.click(screen.getByRole('button', { name: 'Visual' }))

      expect(await screen.findByTestId('workflow-canvas')).toBeInTheDocument()
    })

    it('a non-managing member sees the workflow read-only, with no Save/Reset/Visual controls', async () => {
      renderProjectDetail(
        makeAuthValue({ user: OTHER_DEV, hasRole: () => false }),
        '/projects/p-1?tab=workflow',
      )

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      await screen.findByText('Default (project-wide)')

      expect(screen.queryByRole('button', { name: 'Save workflow' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Visual' })).toBeInTheDocument()
    })
  })

  describe('Notifications tab (Notification Schemes v2)', () => {
    it('shows an unconfigured scheme editor for an Admin, with a row for every event', async () => {
      renderProjectDetail(
        makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
        '/projects/p-1?tab=notifications',
      )

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      expect(await screen.findByText('Issue assigned')).toBeInTheDocument()
      expect(screen.getByText('Comment added')).toBeInTheDocument()
      expect(screen.getByText('Sprint started')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save notification scheme' })).toBeInTheDocument()
    })

    it('a non-managing member sees a read-only summary, with no Save control', async () => {
      renderProjectDetail(
        makeAuthValue({ user: OTHER_DEV, hasRole: () => false }),
        '/projects/p-1?tab=notifications',
      )

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      expect(
        await screen.findByText(/No extra notification routing configured/),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save notification scheme' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('Reports tab (Sprint Reporting Depth)', () => {
    beforeEach(() => {
      server.use(
        http.get(url('/projects/:id/sprints/velocity'), () =>
          HttpResponse.json({ success: true, data: [] }),
        ),
        // Module 9's new Reports-tab widgets - unconditionally rendered whenever this tab is
        // shown, so every test that opens it needs a default here (same reasoning as the
        // grant/level pickers noted elsewhere in this codebase's MSW setup).
        http.get(url('/projects/:id/reports/cfd'), () =>
          HttpResponse.json({ success: true, data: [] }),
        ),
        http.get(url('/projects/:id/reports/cycle-time'), () =>
          HttpResponse.json({
            success: true,
            data: { points: [], averageLeadTimeHours: null, averageCycleTimeHours: null },
          }),
        ),
        http.get(url('/projects/:id/reports/epic-progress'), () =>
          HttpResponse.json({ success: true, data: [] }),
        ),
      )
    })

    it('shows the Velocity chart and a "select a sprint" burndown empty state when no sprint has started', async () => {
      renderProjectDetail(makeAuthValue(), '/projects/p-1?tab=reports')

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      expect(await screen.findByText('Velocity')).toBeInTheDocument()
      expect(screen.getByText('No completed sprints yet.')).toBeInTheDocument()
      expect(screen.getByText('Burndown')).toBeInTheDocument()
      expect(screen.getByText('Select a sprint to view its burndown.')).toBeInTheDocument()
    })

    it('shows the new Module 9 reports: CFD, Control Chart, retrospective, and Epic Burndown', async () => {
      renderProjectDetail(makeAuthValue(), '/projects/p-1?tab=reports')

      await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
      expect(await screen.findByText('Cumulative Flow Diagram')).toBeInTheDocument()
      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
      expect(screen.getByText('Control Chart')).toBeInTheDocument()
      expect(screen.getByText('No issues completed in this period.')).toBeInTheDocument()
      expect(screen.getByText('Select a sprint to view its retrospective.')).toBeInTheDocument()
      expect(screen.getByText('Epic Burndown')).toBeInTheDocument()
      expect(screen.getByText('Select an epic.')).toBeInTheDocument()
    })
  })
})
