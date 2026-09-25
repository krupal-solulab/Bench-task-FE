import { HttpResponse, http } from 'msw'
import {
  mockAuditLogEntries,
  mockComments,
  mockOrganizationSettings,
  mockProjects,
  mockTasks,
  mockUsers,
} from './fixtures'
import type { ApiErrorResponse, ApiSuccess, PaginatedResponse } from '@/types/api.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

function ok<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, message }
}

function paginated<T>(data: T[], page = 1, limit = 20): PaginatedResponse<T> {
  const total = data.length
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  }
}

function fail(statusCode: number, message: string): ApiErrorResponse {
  return {
    statusCode,
    message,
    error: statusCode === 401 ? 'Unauthorized' : statusCode === 403 ? 'Forbidden' : 'Error',
    timestamp: new Date().toISOString(),
    path: '',
  }
}

const url = (path: string) => `${BASE_URL}${path}`

export const handlers = [
  http.post(url('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const user = mockUsers.find((u) => u.email === body.email)
    if (!user || body.password !== 'password123') {
      return HttpResponse.json(fail(401, 'Invalid email or password'), { status: 401 })
    }
    return HttpResponse.json(
      ok({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user }),
    )
  }),

  http.post(url('/auth/register-organization'), async ({ request }) => {
    const body = (await request.json()) as {
      organizationName: string
      adminName: string
      adminEmail: string
      adminPassword: string
    }
    if (mockUsers.some((u) => u.email === body.adminEmail)) {
      return HttpResponse.json(fail(409, 'Email already registered'), { status: 409 })
    }
    const user = {
      id: 'u-new',
      name: body.adminName,
      email: body.adminEmail,
      role: 'Admin' as const,
      isActive: true,
      organizationId: 'org-new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(
      ok({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user }),
    )
  }),

  http.post(url('/auth/refresh'), async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string }
    if (body.refreshToken !== 'mock-refresh-token') {
      return HttpResponse.json(fail(401, 'Invalid refresh token'), { status: 401 })
    }
    return HttpResponse.json(
      ok({ accessToken: 'mock-access-token-2', refreshToken: 'mock-refresh-token' }),
    )
  }),

  http.post(url('/auth/logout'), () => HttpResponse.json(ok(null))),

  http.get(url('/auth/me'), ({ request }) => {
    const auth = request.headers.get('authorization')
    if (!auth) return HttpResponse.json(fail(401, 'Invalid token'), { status: 401 })
    return HttpResponse.json(ok(mockUsers[0]))
  }),

  http.patch(url('/auth/me/password'), () => HttpResponse.json(ok(null))),

  http.get(url('/users'), () => HttpResponse.json(paginated(mockUsers))),
  http.get(url('/users/assignable'), () => HttpResponse.json(paginated(mockUsers))),
  http.post(url('/users'), async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; role: string }
    return HttpResponse.json(
      ok({
        id: 'u-created',
        name: body.name,
        email: body.email,
        role: body.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
  }),
  http.patch(url('/users/:id'), () => HttpResponse.json(ok(mockUsers[0]))),
  http.patch(url('/users/:id/role'), () => HttpResponse.json(ok(mockUsers[0]))),
  http.patch(url('/users/:id/status'), () => HttpResponse.json(ok(mockUsers[0]))),

  http.get(url('/projects'), () => HttpResponse.json(paginated(mockProjects))),
  http.get(url('/projects/:id'), ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id)
    if (!project) return HttpResponse.json(fail(404, 'Project not found'), { status: 404 })
    return HttpResponse.json(ok(project))
  }),
  http.get(url('/projects/:id/tasks'), ({ params }) =>
    HttpResponse.json(paginated(mockTasks.filter((t) => t.project.id === params.id))),
  ),
  http.get(url('/projects/:id/sprints'), () => HttpResponse.json(paginated([]))),
  http.get(url('/projects/:id/sprints/active'), () => HttpResponse.json(ok(null))),
  http.get(url('/projects/:id/releases'), () => HttpResponse.json(paginated([]))),
  // Module 6 - a plain array (not paginated), matching the backend's actual response shape.
  // Grant/level pickers (GrantTeamsAndRoles, PermissionSchemeForm, SecuritySchemeForm,
  // RoleAssignmentsPanel) call these unconditionally, so every test rendering them needs a
  // default even when teams/project-roles aren't the thing under test.
  http.get(url('/teams'), () => HttpResponse.json(ok([]))),
  http.get(url('/project-roles'), () => HttpResponse.json(ok([]))),
  http.get(url('/security-schemes'), () => HttpResponse.json(ok([]))),
  http.get(url('/tasks/search/autocomplete-fields'), () =>
    HttpResponse.json(ok({ fields: [], keywords: [] })),
  ),
  http.get(url('/tasks/search/autocomplete-values'), () => HttpResponse.json(ok([]))),
  http.get(url('/projects/:id/labels'), ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id)
    const labels = new Set<string>()
    for (const task of mockTasks) {
      if (task.project.id === project?.id) task.labels.forEach((l) => labels.add(l))
    }
    return HttpResponse.json(ok([...labels]))
  }),
  // No per-issue-type overrides in the default fixtures - every project's effective fields are
  // just its project-wide customFields, regardless of issueType (mirrors resolveCustomFields'
  // own "no override configured" fallback).
  http.get(url('/projects/:id/custom-fields/effective'), ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id)
    return HttpResponse.json(ok(project?.customFields ?? []))
  }),
  // No project in the default fixtures has configured its own SLA policy, so every project's
  // effective policy is just the system default (mirrors resolveSlaPolicy's own fallback).
  http.get(url('/projects/:id/sla-policy'), () =>
    HttpResponse.json(
      ok([
        { priority: 'P1', resolutionHours: 8 },
        { priority: 'P2', resolutionHours: 24 },
        { priority: 'P3', resolutionHours: 72 },
      ]),
    ),
  ),
  http.get(url('/projects/:id/reports/epic-progress'), () => HttpResponse.json(ok([]))),

  http.get(url('/tasks'), () => HttpResponse.json(paginated(mockTasks))),
  http.get(url('/tasks/my-tasks'), () => HttpResponse.json(paginated(mockTasks))),
  http.get(url('/tasks/overdue'), () => HttpResponse.json(paginated([]))),
  http.get(url('/tasks/:id'), ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.id)
    if (!task) return HttpResponse.json(fail(404, 'Task not found'), { status: 404 })
    return HttpResponse.json(ok(task))
  }),
  http.get(url('/tasks/:taskId/comments'), ({ params }) =>
    HttpResponse.json(paginated(mockComments.filter((c) => c.taskId === params.taskId))),
  ),

  http.get(url('/dashboard/summary'), () =>
    HttpResponse.json(
      ok({
        totalProjects: mockProjects.length,
        projectsByStatus: { Planning: 1, 'In Progress': 1, Completed: 0 },
        totalTasks: mockTasks.length,
        openTasks: 2,
        completedTasks: 0,
        overdueCount: 0,
        completionRate: 0,
      }),
    ),
  ),

  http.get(url('/dashboard/projects-by-status'), () =>
    HttpResponse.json(
      ok([
        { status: 'Planning', count: 1 },
        { status: 'In Progress', count: 1 },
        { status: 'Completed', count: 0 },
      ]),
    ),
  ),
  http.get(url('/dashboard/tasks-status'), () =>
    HttpResponse.json(
      ok([
        { status: 'Todo', count: 1 },
        { status: 'In Progress', count: 1 },
        { status: 'Review', count: 0 },
        { status: 'Done', count: 0 },
      ]),
    ),
  ),
  http.get(url('/dashboard/tasks-by-priority'), () =>
    HttpResponse.json(
      ok([
        { priority: 'P1', count: 1 },
        { priority: 'P2', count: 0 },
        { priority: 'P3', count: 1 },
      ]),
    ),
  ),
  http.get(url('/dashboard/developer-workload'), () =>
    HttpResponse.json(
      ok([
        { userId: 'u-dev1', name: 'Dev One', totalAssigned: 3, completed: 1, completionRate: 33 },
        { userId: 'u-dev2', name: 'Dev Two', totalAssigned: 2, completed: 2, completionRate: 100 },
      ]),
    ),
  ),
  http.get(url('/dashboard/overdue-summary'), () => HttpResponse.json(ok([]))),
  http.get(url('/dashboard/task-trend'), () =>
    HttpResponse.json(
      ok(
        Array.from({ length: 7 }).map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10),
          created: Math.max(0, 3 - i),
          completed: Math.max(0, i - 2),
        })),
      ),
    ),
  ),
  http.get(url('/dashboard/sla-compliance'), () =>
    HttpResponse.json(
      ok([
        { priority: 'P1', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
        { priority: 'P2', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
        { priority: 'P3', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
      ]),
    ),
  ),
  http.get(url('/dashboard/velocity-trend'), () =>
    HttpResponse.json(ok({ points: [], hasStoryPoints: false })),
  ),
  http.get(url('/dashboard/active-sprints-health'), () => HttpResponse.json(ok([]))),
  http.get(url('/dashboard/my-open-issues'), () => HttpResponse.json(ok([]))),
  http.get(url('/dashboard/resolution-time-trend'), () => HttpResponse.json(ok([]))),
  http.get(url('/dashboard/preferences'), () =>
    HttpResponse.json(ok({ hiddenWidgets: [], widgetOrder: [] })),
  ),
  http.put(url('/dashboard/preferences'), async ({ request }) =>
    HttpResponse.json(ok(await request.json())),
  ),

  http.get(url('/saved-filters'), () => HttpResponse.json(ok([]))),

  http.get(url('/canned-responses'), () => HttpResponse.json(ok([]))),

  http.get(url('/organizations/me'), () => HttpResponse.json(ok(mockOrganizationSettings))),
  http.patch(url('/organizations/me'), async ({ request }) => {
    const body = (await request.json()) as Partial<typeof mockOrganizationSettings>
    return HttpResponse.json(ok({ ...mockOrganizationSettings, ...body }))
  }),

  http.get(url('/audit-log'), () => HttpResponse.json(paginated(mockAuditLogEntries))),

  http.get(url('/platform/integrations/health'), () =>
    HttpResponse.json(
      ok([
        { name: 'MongoDB', status: 'ok', detail: 'Reachable.' },
        { name: 'Redis', status: 'ok', detail: 'Reachable.' },
        { name: 'Object storage (S3/MinIO)', status: 'ok', detail: 'Reachable.' },
        { name: 'Email', status: 'stub', detail: 'Logging-only stub.' },
      ]),
    ),
  ),
]
