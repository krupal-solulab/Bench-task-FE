export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Project & Task Management'

export const STATUS_COLORS = {
  project: {
    Planning: 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  task: {
    Todo: 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    Review: 'bg-amber-100 text-amber-700 border-amber-200',
    Done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  sprint: {
    Planned: 'bg-slate-100 text-slate-700 border-slate-200',
    Active: 'bg-blue-100 text-blue-700 border-blue-200',
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
} as const

export const PRIORITY_COLORS = {
  P1: 'bg-red-100 text-red-700 border-red-200',
  P2: 'bg-amber-100 text-amber-700 border-amber-200',
  P3: 'bg-slate-100 text-slate-600 border-slate-200',
} as const

/** Raw hex for Recharts fills/strokes — mirrors STATUS_COLORS/PRIORITY_COLORS for visual continuity. */
export const CHART_COLORS = {
  projectStatus: { Planning: '#64748b', 'In Progress': '#3b82f6', Completed: '#10b981' },
  taskStatus: { Todo: '#64748b', 'In Progress': '#3b82f6', Review: '#f59e0b', Done: '#10b981' },
  sprintStatus: { Planned: '#64748b', Active: '#3b82f6', Completed: '#10b981' },
  priority: { P1: '#ef4444', P2: '#f59e0b', P3: '#94a3b8' },
  trend: { created: '#3b82f6', completed: '#10b981' },
  single: '#3b82f6',
} as const

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export const QUERY_STALE_TIME = {
  list: 30_000,
  dashboard: 60_000,
} as const

/** Structured TanStack Query keys — keep every hook's key derived from these. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: unknown) => ['users', 'list', filters] as const,
    assignable: ['users', 'assignable'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (filters: unknown) => ['projects', 'list', filters] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    members: (id: string) => ['projects', 'detail', id, 'members'] as const,
    tasks: (id: string, filters: unknown) => ['projects', 'detail', id, 'tasks', filters] as const,
    stats: (id: string) => ['projects', 'detail', id, 'stats'] as const,
    activity: (id: string) => ['projects', 'detail', id, 'activity'] as const,
    workflow: (id: string) => ['projects', 'detail', id, 'workflow'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters: unknown) => ['tasks', 'list', filters] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    overdue: ['tasks', 'overdue'] as const,
    myTasks: (filters: unknown) => ['tasks', 'my-tasks', filters] as const,
    activity: (id: string) => ['tasks', 'detail', id, 'activity'] as const,
    epicProgress: (id: string) => ['tasks', 'detail', id, 'epic-progress'] as const,
  },
  comments: {
    list: (taskId: string, filters: unknown) => ['comments', taskId, 'list', filters] as const,
  },
  sprints: {
    all: ['sprints'] as const,
    list: (projectId: string, filters: unknown) => ['sprints', 'list', projectId, filters] as const,
    detail: (id: string) => ['sprints', 'detail', id] as const,
    active: (projectId: string) => ['sprints', 'active', projectId] as const,
    activity: (id: string) => ['sprints', 'detail', id, 'activity'] as const,
  },
  attachments: {
    list: (taskId: string, filters: unknown) => ['attachments', taskId, 'list', filters] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: (filters: unknown) => ['organizations', 'list', filters] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
  },
  platform: {
    stats: ['platform', 'stats'] as const,
    logs: (filters: unknown) => ['platform', 'logs', filters] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (scope: unknown) => ['dashboard', 'summary', scope] as const,
    projectsByStatus: (scope: unknown) => ['dashboard', 'projects-by-status', scope] as const,
    tasksStatus: (scope: unknown) => ['dashboard', 'tasks-status', scope] as const,
    tasksByPriority: (scope: unknown) => ['dashboard', 'tasks-by-priority', scope] as const,
    developerWorkload: (scope: unknown) => ['dashboard', 'developer-workload', scope] as const,
    overdueSummary: (scope: unknown) => ['dashboard', 'overdue-summary', scope] as const,
    taskTrend: (scope: unknown) => ['dashboard', 'task-trend', scope] as const,
  },
} as const
