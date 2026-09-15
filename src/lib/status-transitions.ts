import type { MemberPermissions, ProjectStatus } from '@/types/project.types'
import type { Task } from '@/types/task.types'
import type { Role } from '@/types/user.types'
import type { Workflow } from '@/types/workflow.types'
import { canEditTaskField } from './permissions'

/** Mirrors the backend's legal-transition rules. The API is the final arbiter; a 409 can still occur. */
const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Planning: ['In Progress'],
  'In Progress': ['Completed', 'Planning'],
  Completed: [],
}

/**
 * The system default workflow - byte-for-byte the backend's DEFAULT_WORKFLOW (see
 * workflow.schema.ts). Used as the fallback for any project that hasn't configured a custom
 * workflow, so a project's Board/status dropdown behave identically to before this feature existed.
 */
export const DEFAULT_WORKFLOW: Workflow = {
  statuses: [
    { name: 'Todo', category: 'To Do' },
    { name: 'In Progress', category: 'In Progress' },
    { name: 'Review', category: 'In Progress' },
    { name: 'Done', category: 'Done' },
  ],
  transitions: [
    { from: 'Todo', to: 'In Progress' },
    { from: 'In Progress', to: 'Review' },
    { from: 'In Progress', to: 'Todo' },
    { from: 'Review', to: 'Done' },
    { from: 'Review', to: 'In Progress' },
    { from: 'Done', to: 'In Progress' },
  ],
  initialStatus: 'Todo',
}

export function legalProjectTransitions(current: ProjectStatus): ProjectStatus[] {
  return PROJECT_TRANSITIONS[current]
}

export function isLegalProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_TRANSITIONS[from].includes(to)
}

export function legalTaskTransitions(workflow: Workflow, current: string): string[] {
  return workflow.transitions.filter((t) => t.from === current).map((t) => t.to)
}

export function isLegalTaskTransition(workflow: Workflow, from: string, to: string): boolean {
  return legalTaskTransitions(workflow, from).includes(to)
}

/**
 * The single "may this task be dropped on that column" check shared by the Kanban board's
 * drag-and-drop and (indirectly, via canEditTaskField) TaskStatusControl's dropdown - kept as a
 * plain function so it's unit-testable without simulating real pointer/drag events in jsdom.
 * The API is still the final arbiter (a 409/403 can still occur); this only avoids firing a
 * request that's already known to be illegal or unauthorized.
 */
export function canDragTaskTo(
  task: Task,
  targetStatus: string,
  role: Role | undefined,
  userId: string | undefined,
  workflow: Workflow = DEFAULT_WORKFLOW,
  grant?: MemberPermissions | null,
): boolean {
  if (task.status === targetStatus) return false
  if (!isLegalTaskTransition(workflow, task.status, targetStatus)) return false
  const isAssignee = !!userId && task.assignee?.id === userId
  // Dragging a card between columns is exclusively a status change, so this always checks the
  // 'status' capability - not 'other' - regardless of assignment. Before per-project grants
  // existed this ternary's two branches were equivalent for every real caller (Admin/Manager
  // short-circuit true either way; a non-assignee Developer was false either way), but now that
  // canChangeAnyTaskStatus is a real, independent grant, only 'status' resolves it correctly.
  return canEditTaskField(role, 'status', isAssignee, grant)
}
