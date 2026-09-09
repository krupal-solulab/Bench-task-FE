import { describe, expect, it } from 'vitest'
import {
  canDragTaskTo,
  isLegalProjectTransition,
  isLegalTaskTransition,
  legalProjectTransitions,
  legalTaskTransitions,
} from './status-transitions'
import type { Task } from '@/types/task.types'
import type { User } from '@/types/user.types'

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
    priority: 'P2',
    dueDate: null,
    createdBy: makeUser({ id: 'manager-1', role: 'Manager' }),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('status-transitions', () => {
  it('offers only the legal next statuses for a task in Todo', () => {
    expect(legalTaskTransitions('Todo')).toEqual(['In Progress'])
  })

  it('offers no further transitions once a task is Done', () => {
    expect(legalTaskTransitions('Done')).toEqual([])
  })

  it('allows moving a Review task back to In Progress or forward to Done', () => {
    expect(legalTaskTransitions('Review')).toEqual(['Done', 'In Progress'])
  })

  it('rejects an illegal task transition (Todo -> Done)', () => {
    expect(isLegalTaskTransition('Todo', 'Done')).toBe(false)
  })

  it('accepts a legal task transition (Todo -> In Progress)', () => {
    expect(isLegalTaskTransition('Todo', 'In Progress')).toBe(true)
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
  })
})
