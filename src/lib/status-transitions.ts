import type { ProjectStatus } from '@/types/project.types'
import type { TaskStatus } from '@/types/task.types'

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
  Done: [],
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
