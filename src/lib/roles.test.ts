import { describe, expect, it } from 'vitest'
import {
  customRoleChoice,
  effectiveMemberGrant,
  fromRoleChoice,
  roleChoiceLabel,
  toRoleChoice,
  userRoleLabel,
} from '@/lib/roles'
import { mockCustomRoles } from '@/test/mocks/fixtures'
import type { MemberPermissions, ProjectMember } from '@/types/project.types'
import type { User } from '@/types/user.types'

const NONE: MemberPermissions = {
  canCreateTask: false,
  canEditAnyTask: false,
  canDeleteTask: false,
  canChangeAnyTaskStatus: false,
  canManageSprints: false,
  canManageProject: false,
}

describe('role choices', () => {
  it('round-trips built-in and custom roles', () => {
    expect(toRoleChoice({ role: 'Manager', customRoleId: null })).toBe('Manager')
    expect(toRoleChoice({ role: 'Developer', customRoleId: 'role-qa' })).toBe('custom:role-qa')
    expect(fromRoleChoice('Manager', mockCustomRoles)).toEqual({
      role: 'Manager',
      customRoleId: null,
    })
    expect(fromRoleChoice(customRoleChoice('role-qa'), mockCustomRoles)).toEqual({
      role: 'Developer',
      customRoleId: 'role-qa',
    })
  })

  it('labels a user by their custom role, else their built-in role', () => {
    expect(userRoleLabel({ role: 'Developer', customRoleId: 'role-ba' }, mockCustomRoles)).toBe(
      'Business Analyst',
    )
    expect(userRoleLabel({ role: 'Admin', customRoleId: null }, mockCustomRoles)).toBe('Admin')
    expect(roleChoiceLabel('custom:gone', mockCustomRoles)).toBe('Custom role')
  })
})

describe('effectiveMemberGrant', () => {
  const qa = {
    id: 'u-1',
    customRole: { ...mockCustomRoles[0]!, permissions: { ...NONE, canChangeAnyTaskStatus: true } },
  } as Pick<User, 'id' | 'customRole'>
  const member = (permissions: MemberPermissions | null) =>
    ({ user: { id: 'u-1' }, role: 'member', joinedAt: '', permissions }) as unknown as ProjectMember

  it('adds the custom role permissions to a member (union with the per-project grant)', () => {
    const grant = effectiveMemberGrant({ members: [member({ ...NONE, canCreateTask: true })] }, qa)
    expect(grant).toEqual({ ...NONE, canCreateTask: true, canChangeAnyTaskStatus: true })
  })

  it('uses the project override for the user role instead of the org defaults', () => {
    const dev = {
      id: 'u-1',
      customRole: null,
      roleId: 'r-dev',
      rolePermissions: { ...NONE, canCreateTask: true },
    } as Pick<User, 'id' | 'customRole' | 'roleId' | 'rolePermissions'>
    const project = {
      members: [member(null)],
      rolePermissionOverrides: [
        { roleId: 'r-dev', permissions: { ...NONE, canManageProject: true } },
      ],
    }
    expect(effectiveMemberGrant(project, dev)).toEqual({ ...NONE, canManageProject: true })
    expect(effectiveMemberGrant({ members: [member(null)] }, dev)).toEqual({
      ...NONE,
      canCreateTask: true,
    })
  })

  it('gives nothing outside projects the user is a member of', () => {
    expect(effectiveMemberGrant({ members: [] }, qa)).toBeNull()
  })

  it('stays null for a member with neither a grant nor a custom role', () => {
    expect(
      effectiveMemberGrant({ members: [member(null)] }, { id: 'u-1', customRole: null }),
    ).toBeNull()
  })
})
