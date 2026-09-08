import { describe, expect, it } from 'vitest'
import { can, canEditTaskField } from './permissions'

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
})
