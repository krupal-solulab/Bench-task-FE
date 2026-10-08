import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { cn } from '@/lib/cn'
import { ROLE_COLOR_CLASSES, toRoleChoice, findCustomRole } from '@/lib/roles'
import type { User } from '@/types/user.types'

/** A user's role as a small badge: their custom role (QA, DevOps, ...) in its colour, else the
 * built-in role in neutral grey. */
export function RoleBadge({
  user,
  className,
}: {
  user: Pick<User, 'role' | 'customRoleId'>
  className?: string
}) {
  const { data: customRoles } = useCustomRoles(!!user.customRoleId)
  const custom = user.customRoleId ? findCustomRole(toRoleChoice(user), customRoles) : undefined
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        custom ? ROLE_COLOR_CLASSES[custom.color].badge : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {custom && (
        <span className={cn('h-1.5 w-1.5 rounded-full', ROLE_COLOR_CLASSES[custom.color].dot)} />
      )}
      {custom?.name ?? user.role}
    </span>
  )
}
