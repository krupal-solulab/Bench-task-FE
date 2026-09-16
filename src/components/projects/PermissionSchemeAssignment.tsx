import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissionSchemes } from '@/hooks/queries/usePermissionSchemes'
import { useAssignPermissionScheme } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'

const NONE = '__none__'

export interface PermissionSchemeAssignmentProps {
  projectId: string
  permissionSchemeId: string | null
  canManage: boolean
}

/** Assigns (or unassigns) one of the organization's reusable permission schemes to this project -
 * schemes themselves are created/edited on the Admin-only Permission Schemes page. */
export function PermissionSchemeAssignment({
  projectId,
  permissionSchemeId,
  canManage,
}: PermissionSchemeAssignmentProps) {
  const { data: schemes } = usePermissionSchemes()
  const assignScheme = useAssignPermissionScheme(projectId)
  const { showToast } = useToast()

  const current = schemes?.find((s) => s.id === permissionSchemeId)

  async function handleChange(value: string) {
    try {
      await assignScheme.mutateAsync(value === NONE ? null : value)
      showToast({ title: 'Permission scheme updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Permission scheme</h3>
        <p className="text-sm text-muted-foreground">
          {current ? current.name : 'No scheme assigned - default role permissions apply.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Permission scheme</h3>
      <p className="text-sm text-muted-foreground">
        Assign a scheme to control per-action access for this project, beyond the default role
        permissions. Manage schemes themselves from Admin &rsaquo; Permission Schemes.
      </p>
      <Select value={permissionSchemeId ?? NONE} onValueChange={(v) => void handleChange(v)}>
        <SelectTrigger className="w-64" aria-label="Permission scheme">
          <SelectValue placeholder="None (default permissions)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None (default permissions)</SelectItem>
          {(schemes ?? []).map((scheme) => (
            <SelectItem key={scheme.id} value={scheme.id}>
              {scheme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
