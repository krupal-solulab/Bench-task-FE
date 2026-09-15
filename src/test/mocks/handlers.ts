import { HttpResponse, http } from 'msw'
import { mockComments, mockProjects, mockTasks, mockUsers } from './fixtures'
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
  http.get(url('/projects/:id/labels'), ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id)
    const labels = new Set<string>()
    for (const task of mockTasks) {
      if (task.project.id === project?.id) task.labels.forEach((l) => labels.add(l))
    }
    return HttpResponse.json(ok([...labels]))
  }),

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
]
