import type { ProjectStatus } from '@/types/project.types'
import type { Task, TaskStatus } from '@/types/task.types'
import type { Role } from '@/types/user.types'
import { canEditTaskField } from './permissions'

/** Mirrors the backend's legal-transition rules. The API is the final arbiter; a 409 can still occur. */
const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Planning: ['In Progress'],
  'In Progress': ['Completed', 'Planning'],
  Completed: [],
}

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  Todo: ['In Progress'],
  'In Progress': ['Review', 'Todo'],
  Review: ['Done', 'In Progress'],
  Done: ['In Progress'],
}

export function legalProjectTransitions(current: ProjectStatus): ProjectStatus[] {
  return PROJECT_TRANSITIONS[current]
}

export function legalTaskTransitions(current: TaskStatus): TaskStatus[] {
  return TASK_TRANSITIONS[current]
}

export function isLegalProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_TRANSITIONS[from].includes(to)
}

export function isLegalTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to)
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
  targetStatus: TaskStatus,
  role: Role | undefined,
  userId: string | undefined,
): boolean {
  if (task.status === targetStatus) return false
  if (!isLegalTaskTransition(task.status, targetStatus)) return false
  const isAssignee = !!userId && task.assignee?.id === userId
  return canEditTaskField(role, isAssignee ? 'status' : 'other', isAssignee)
}
