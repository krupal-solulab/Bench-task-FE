import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { RoleChoiceSelect } from '@/components/admin/RoleChoiceSelect'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { findCustomRole } from '@/lib/roles'
import { projectInviteSchema, type ProjectInviteFormValues } from '@/schemas/project-invite.schema'
import { PROJECT_MEMBER_ROLES, type OrgRole } from '@/types/user.types'

export const PROJECT_INVITE_FORM_ID = 'project-invite-form'

const ROLE_HINTS: Record<OrgRole, string> = {
  Developer: 'Works on tasks in the projects they belong to.',
  Manager: 'Can also own and run projects of their own.',
  Admin: 'Full access to the whole organization, including its settings and users.',
}

/** Email + role only: the invitee enters their own name, and the server generates a temporary
 * password (the owner never types one). */
export function ProjectInviteForm({
  onSubmit,
  builtInRoles = PROJECT_MEMBER_ROLES,
  formId = PROJECT_INVITE_FORM_ID,
}: {
  onSubmit: (values: ProjectInviteFormValues) => Promise<void>
  /** Built-in roles offered (custom roles are always listed). Admin > Users adds Admin. */
  builtInRoles?: readonly OrgRole[]
  formId?: string
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectInviteFormValues>({
    resolver: zodResolver(projectInviteSchema),
    defaultValues: { email: '', role: 'Developer' },
  })
  const role = watch('role')
  const { data: customRoles } = useCustomRoles()
  const custom = findCustomRole(role, customRoles)
  const roleHint =
    custom?.description ||
    (custom ? `Custom role on ${custom.accessLevel} access.` : ROLE_HINTS[role as OrgRole])

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Email" htmlFor="invite-email" error={errors.email?.message} required>
        <Input id="invite-email" type="email" autoComplete="off" {...register('email')} />
      </FormField>
      <FormField label="Role" htmlFor="invite-role" hint={roleHint} required>
        <RoleChoiceSelect
          id="invite-role"
          value={role}
          onChange={(v) => setValue('role', v)}
          builtIn={builtInRoles}
        />
      </FormField>
      <p className="text-xs text-muted-foreground">
        They'll add their own name when they join. A temporary password is generated for them, and
        the invitation link expires in 7 days.
      </p>
    </form>
  )
}
