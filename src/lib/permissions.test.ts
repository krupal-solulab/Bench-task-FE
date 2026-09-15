import { describe, expect, it } from 'vitest'
import { can, canCreateTaskInProject, canEditTaskField } from './permissions'
import { NO_MEMBER_PERMISSIONS } from '@/types/project.types'

describe('permissions', () => {
  it('grants Admin every capability a Manager has, plus user management', () => {
    expect(can('Admin', 'user:manage')).toBe(true)
    expect(can('Manager', 'user:manage')).toBe(false)
  })

  it('denies a Developer project/task management capabilities', () => {
    expect(can('Developer', 'project:create')).toBe(false)
    expect(can('Developer', 'task:delete')).toBe(false)
  })

  it('denies any capability when role is undefined (logged out)', () => {
    expect(can(undefined, 'task:create')).toBe(false)
  })

  it('lets a Developer edit only the status of a task assigned to them', () => {
    expect(canEditTaskField('Developer', 'status', true)).toBe(true)
    expect(canEditTaskField('Developer', 'other', true)).toBe(false)
    expect(canEditTaskField('Developer', 'status', false)).toBe(false)
  })

  it('lets a Manager edit any field regardless of assignment', () => {
    expect(canEditTaskField('Manager', 'other', false)).toBe(true)
  })

  it('grants a PlatformAdmin only the platform capability, no org-data capabilities', () => {
    expect(can('PlatformAdmin', 'platform:manageOrganizations')).toBe(true)
    expect(can('PlatformAdmin', 'project:create')).toBe(false)
    expect(can('PlatformAdmin', 'task:create')).toBe(false)
    expect(can('PlatformAdmin', 'user:manage')).toBe(false)
    expect(can('PlatformAdmin', 'dashboard:viewOrgWide')).toBe(false)
  })

  describe('per-project member grants (Phase 3: permission schemes)', () => {
    it('extends a Developer with no grant exactly as before (regression)', () => {
      expect(canEditTaskField('Developer', 'other', false, null)).toBe(false)
      expect(canEditTaskField('Developer', 'delete', false, null)).toBe(false)
      expect(canEditTaskField('Developer', 'status', false, null)).toBe(false)
      expect(canCreateTaskInProject('Developer', null)).toBe(false)
    })

    it('lets a Developer edit any task when granted canEditAnyTask', () => {
      const grant = { ...NO_MEMBER_PERMISSIONS, canEditAnyTask: true }
      expect(canEditTaskField('Developer', 'other', false, grant)).toBe(true)
      expect(canEditTaskField('Developer', 'delete', false, grant)).toBe(false)
    })

    it('lets a Developer delete a task when granted canDeleteTask', () => {
      const grant = { ...NO_MEMBER_PERMISSIONS, canDeleteTask: true }
      expect(canEditTaskField('Developer', 'delete', false, grant)).toBe(true)
      expect(canEditTaskField('Developer', 'other', false, grant)).toBe(false)
    })

    it('lets a non-assignee Developer change status when granted canChangeAnyTaskStatus', () => {
      const grant = { ...NO_MEMBER_PERMISSIONS, canChangeAnyTaskStatus: true }
      expect(canEditTaskField('Developer', 'status', false, grant)).toBe(true)
    })

    it('lets a Developer create tasks in a project when granted canCreateTask', () => {
      expect(
        canCreateTaskInProject('Developer', { ...NO_MEMBER_PERMISSIONS, canCreateTask: true }),
      ).toBe(true)
    })

    it('a grant never reduces what an Admin/Manager can already do', () => {
      expect(canEditTaskField('Manager', 'delete', false, null)).toBe(true)
      expect(canCreateTaskInProject('Admin', null)).toBe(true)
    })
  })
})
