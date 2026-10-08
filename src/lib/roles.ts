import type { CustomRole, CustomRoleColor } from '@/types/custom-role.types'
import type { MemberPermissions, Project } from '@/types/project.types'
import { ORG_ROLES, type OrgRole, type User } from '@/types/user.types'

/**
 * One value for "which role": a built-in role ('Admin' | 'Manager' | 'Developer') or a custom
 * role as `custom:<id>` - so a single picker can offer both.
 */
export type RoleChoice = string
const CUSTOM_PREFIX = 'custom:'

export function customRoleChoice(id: string): RoleChoice {
  return `${CUSTOM_PREFIX}${id}`
}

export function toRoleChoice(user: Pick<User, 'role' | 'customRoleId'>): RoleChoice {
  return user.customRoleId ? customRoleChoice(user.customRoleId) : user.role
}

/** What the API takes for a role choice (a custom role sets the built-in role to its level). */
export function fromRoleChoice(
  choice: RoleChoice,
  customRoles: CustomRole[] | undefined,
): { role: OrgRole; customRoleId: string | null } {
  if (choice.startsWith(CUSTOM_PREFIX)) {
    const id = choice.slice(CUSTOM_PREFIX.length)
    const custom = customRoles?.find((r) => r.id === id)
    return { role: custom?.accessLevel ?? 'Developer', customRoleId: id }
  }
  const role = (ORG_ROLES as readonly string[]).includes(choice) ? (choice as OrgRole) : 'Developer'
  return { role, customRoleId: null }
}

export function findCustomRole(
  choice: RoleChoice,
  customRoles: CustomRole[] | undefined,
): CustomRole | undefined {
  return customRoles?.find((r) => customRoleChoice(r.id) === choice)
}

export function roleChoiceLabel(choice: RoleChoice, customRoles: CustomRole[] | undefined): string {
  if (!choice.startsWith(CUSTOM_PREFIX)) return choice
  return findCustomRole(choice, customRoles)?.name ?? 'Custom role'
}

/** A user's role as people should read it: "QA" for a QA, else the built-in role. */
export function userRoleLabel(
  user: Pick<User, 'role' | 'customRoleId'>,
  customRoles: CustomRole[] | undefined,
): string {
  return roleChoiceLabel(toRoleChoice(user), customRoles)
}

/** Badge colours per role colour - readable in light and dark mode. */
export const ROLE_COLOR_CLASSES: Record<CustomRoleColor, { badge: string; dot: string }> = {
  slate: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  cyan: {
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300',
    dot: 'bg-cyan-500',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
}

export const PERMISSION_LABELS: Array<{
  key: keyof MemberPermissions
  label: string
  hint: string
}> = [
  { key: 'canCreateTask', label: 'Create tasks', hint: 'Create new issues in their projects' },
  { key: 'canEditAnyTask', label: 'Edit any task', hint: 'Edit issues assigned to anyone' },
  {
    key: 'canChangeAnyTaskStatus',
    label: 'Change any status',
    hint: 'Move anyone’s issue through the workflow',
  },
  { key: 'canDeleteTask', label: 'Delete tasks', hint: 'Delete issues' },
  { key: 'canManageSprints', label: 'Manage sprints', hint: 'Create, start and complete sprints' },
  {
    key: 'canManageProject',
    label: 'Manage project',
    hint: 'Edit the project, members & invites, sprints & releases and settings',
  },
]

/**
 * The signed-in user's effective grant in a project: their per-project member grant plus their
 * custom role's permissions - exactly what the API enforces (members only; null otherwise).
 */
export function effectiveMemberGrant(
  project: Pick<Project, 'members' | 'rolePermissionOverrides'> | undefined,
  user: Pick<User, 'id' | 'customRole' | 'roleId' | 'rolePermissions'> | null | undefined,
): MemberPermissions | null {
  const member = user ? project?.members.find((m) => m.user.id === user.id) : undefined
  if (!member) return null
  const own = member.permissions
  // This project's override for the user's role, else the role's organization defaults.
  const override = user?.roleId
    ? project?.rolePermissionOverrides?.find((o) => o.roleId === user.roleId)
    : undefined
  const fromRole = override?.permissions ?? user?.rolePermissions ?? user?.customRole?.permissions
  if (!own && !fromRole) return null
  const has = (k: keyof MemberPermissions) => !!own?.[k] || !!fromRole?.[k]
  return {
    canCreateTask: has('canCreateTask'),
    canEditAnyTask: has('canEditAnyTask'),
    canDeleteTask: has('canDeleteTask'),
    canChangeAnyTaskStatus: has('canChangeAnyTaskStatus'),
    canManageSprints: has('canManageSprints'),
    canManageProject: has('canManageProject'),
  }
}
