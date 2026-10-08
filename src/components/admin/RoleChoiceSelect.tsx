import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { cn } from '@/lib/cn'
import { customRoleChoice, ROLE_COLOR_CLASSES, type RoleChoice } from '@/lib/roles'
import { ORG_ROLES, type OrgRole } from '@/types/user.types'

/**
 * One role picker for everything that assigns a role: the built-in roles plus the
 * organization's custom roles (QA, DevOps, ...). Values are RoleChoice strings - see lib/roles.
 */
export function RoleChoiceSelect({
  value,
  onChange,
  builtIn = ORG_ROLES,
  id,
  className,
  ariaLabel,
  placeholder,
  disabled,
  allOption,
}: {
  value: RoleChoice | ''
  onChange: (choice: RoleChoice) => void
  /** Built-in roles to offer (e.g. no Admin for project invites). */
  builtIn?: readonly OrgRole[]
  id?: string
  className?: string
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  /** Adds a leading "all roles" option (for filters) with this value + label. */
  allOption?: { value: string; label: string }
}) {
  const { data: allRoles } = useCustomRoles()
  // The built-in Manager/Developer rows are configuration, not assignable custom roles.
  const customRoles = allRoles?.filter((r) => !r.builtInRole)
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOption && <SelectItem value={allOption.value}>{allOption.label}</SelectItem>}
        <SelectGroup>
          <GroupLabel>Built-in roles</GroupLabel>
          {builtIn.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectGroup>
        {(customRoles?.length ?? 0) > 0 && (
          <SelectGroup>
            <GroupLabel>Custom roles</GroupLabel>
            {customRoles!.map((role) => (
              <SelectItem key={role.id} value={customRoleChoice(role.id)}>
                <span className="flex items-center gap-2">
                  <span
                    className={cn('h-2 w-2 rounded-full', ROLE_COLOR_CLASSES[role.color].dot)}
                    aria-hidden
                  />
                  {role.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}
