import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKFLOW,
  canDragTaskTo,
  isLegalProjectTransition,
  isLegalTaskTransition,
  legalProjectTransitions,
  legalTaskTransitions,
} from './status-transitions'
import type { Task } from '@/types/task.types'
import type { User } from '@/types/user.types'
import type { Workflow } from '@/types/workflow.types'
import { NO_MEMBER_PERMISSIONS } from '@/types/project.types'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'dev-1',
    name: 'Dev One',
    email: 'dev@example.com',
    role: 'Developer',
    isActive: true,
    organizationId: 'org-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'A task',
    description: '',
    project: { id: 'project-1', name: 'A project' },
    assignee: null,
    status: 'Todo',
    statusCategory: 'To Do',
    priority: 'P2',
    dueDate: null,
    createdBy: makeUser({ id: 'manager-1', role: 'Manager' }),
    sprint: null,
    rank: 1024,
    issueType: 'Task',
    parent: null,
    storyPoints: null,
    issueKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const CUSTOM_WORKFLOW: Workflow = {
  statuses: [
    { name: 'Backlog', category: 'To Do' },
    { name: 'Building', category: 'In Progress' },
    { name: 'Shipped', category: 'Done' },
  ],
  transitions: [
    { from: 'Backlog', to: 'Building' },
    { from: 'Building', to: 'Shipped' },
  ],
  initialStatus: 'Backlog',
}

describe('status-transitions', () => {
  describe('the system default workflow (regression: must match today exactly)', () => {
    it('offers only the legal next statuses for a task in Todo', () => {
      expect(legalTaskTransitions(DEFAULT_WORKFLOW, 'Todo')).toEqual(['In Progress'])
    })

    it('allows reopening a Done task back to In Progress (regression: this drifted out of sync with the backend, which has always allowed it, and silently blocked every reopen/drag from Done)', () => {
      expect(legalTaskTransitions(DEFAULT_WORKFLOW, 'Done')).toEqual(['In Progress'])
    })

    it('allows moving a Review task back to In Progress or forward to Done', () => {
      expect(legalTaskTransitions(DEFAULT_WORKFLOW, 'Review')).toEqual(['Done', 'In Progress'])
    })

    it('rejects an illegal task transition (Todo -> Done)', () => {
      expect(isLegalTaskTransition(DEFAULT_WORKFLOW, 'Todo', 'Done')).toBe(false)
    })

    it('accepts a legal task transition (Todo -> In Progress)', () => {
      expect(isLegalTaskTransition(DEFAULT_WORKFLOW, 'Todo', 'In Progress')).toBe(true)
    })
  })

  describe('a custom workflow', () => {
    it('reports the configured legal moves for a custom status name', () => {
      expect(legalTaskTransitions(CUSTOM_WORKFLOW, 'Building')).toEqual(['Shipped'])
    })

    it('rejects a move the custom workflow never configured', () => {
      expect(isLegalTaskTransition(CUSTOM_WORKFLOW, 'Backlog', 'Shipped')).toBe(false)
    })

    it('accepts a configured move', () => {
      expect(isLegalTaskTransition(CUSTOM_WORKFLOW, 'Backlog', 'Building')).toBe(true)
    })
  })

  it('offers only Completed and Planning from In Progress for a project', () => {
    expect(legalProjectTransitions('In Progress')).toEqual(['Completed', 'Planning'])
  })

  it('rejects re-opening a Completed project', () => {
    expect(isLegalProjectTransition('Completed', 'Planning')).toBe(false)
  })

  describe('canDragTaskTo', () => {
    it('allows a Manager to drag any task through a legal transition', () => {
      const task = makeTask({ status: 'Todo' })
      expect(canDragTaskTo(task, 'In Progress', 'Manager', 'manager-1')).toBe(true)
    })

    it('allows an assigned Developer to drag their own task through a legal transition', () => {
      const task = makeTask({ status: 'Todo', assignee: makeUser({ id: 'dev-1' }) })
      expect(canDragTaskTo(task, 'In Progress', 'Developer', 'dev-1')).toBe(true)
    })

    it("rejects a Developer dragging a task they aren't assigned to", () => {
      const task = makeTask({ status: 'Todo', assignee: makeUser({ id: 'someone-else' }) })
      expect(canDragTaskTo(task, 'In Progress', 'Developer', 'dev-1')).toBe(false)
    })

    it('rejects a Developer dragging their own unassigned task (no assignee at all)', () => {
      const task = makeTask({ status: 'Todo', assignee: null })
      expect(canDragTaskTo(task, 'In Progress', 'Developer', 'dev-1')).toBe(false)
    })

    it('rejects an illegal transition even for an Admin (Todo -> Done)', () => {
      const task = makeTask({ status: 'Todo' })
      expect(canDragTaskTo(task, 'Done', 'Admin', 'admin-1')).toBe(false)
    })

    it('rejects dropping a task back onto its own current column', () => {
      const task = makeTask({ status: 'Todo' })
      expect(canDragTaskTo(task, 'Todo', 'Admin', 'admin-1')).toBe(false)
    })

    it('rejects when role is undefined (logged out / loading)', () => {
      const task = makeTask({ status: 'Todo' })
      expect(canDragTaskTo(task, 'In Progress', undefined, undefined)).toBe(false)
    })

    it('allows dragging a Done task back to In Progress', () => {
      const task = makeTask({ status: 'Done' })
      expect(canDragTaskTo(task, 'In Progress', 'Manager', 'manager-1')).toBe(true)
    })

    it('respects a custom workflow passed explicitly', () => {
      const task = makeTask({ status: 'Backlog' })
      expect(canDragTaskTo(task, 'Building', 'Manager', 'manager-1', CUSTOM_WORKFLOW)).toBe(true)
      expect(canDragTaskTo(task, 'Shipped', 'Manager', 'manager-1', CUSTOM_WORKFLOW)).toBe(false)
    })

    it("respects a per-project grant for a Developer dragging a task they aren't assigned to (Phase 3)", () => {
      const task = makeTask({ status: 'Todo', assignee: makeUser({ id: 'someone-else' }) })
      const grant = { ...NO_MEMBER_PERMISSIONS, canChangeAnyTaskStatus: true }
      expect(
        canDragTaskTo(task, 'In Progress', 'Developer', 'dev-1', DEFAULT_WORKFLOW, grant),
      ).toBe(true)
      expect(canDragTaskTo(task, 'In Progress', 'Developer', 'dev-1', DEFAULT_WORKFLOW, null)).toBe(
        false,
      )
    })
  })
})
