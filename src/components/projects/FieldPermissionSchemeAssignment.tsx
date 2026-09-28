import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFieldPermissionSchemes } from '@/hooks/queries/useFieldPermissionSchemes'
import { useAssignFieldPermissionScheme } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'

const NONE = '__none__'

export interface FieldPermissionSchemeAssignmentProps {
  projectId: string
  fieldPermissionSchemeId: string | null
  canManage: boolean
}

/** Assigns (or unassigns) one of the organization's reusable field permission schemes to this
 * project - schemes themselves are created/edited on the Admin-only Field Permission Schemes
 * page. Mirrors SecuritySchemeAssignment.tsx exactly. */
export function FieldPermissionSchemeAssignment({
  projectId,
  fieldPermissionSchemeId,
  canManage,
}: FieldPermissionSchemeAssignmentProps) {
  const { data: schemes } = useFieldPermissionSchemes()
  const assignScheme = useAssignFieldPermissionScheme(projectId)
  const { showToast } = useToast()

  const current = schemes?.find((s) => s.id === fieldPermissionSchemeId)

  async function handleChange(value: string) {
    try {
      await assignScheme.mutateAsync(value === NONE ? null : value)
      showToast({ title: 'Field permission scheme updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update field permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Field permission scheme</h3>
        <p className="text-sm text-muted-foreground">
          {current ? current.name : 'No scheme assigned - no field is view/edit-restricted.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Field permission scheme</h3>
      <p className="text-sm text-muted-foreground">
        Assign a scheme to hide or lock specific fields on this project's issues, per role. Manage
        schemes themselves from Admin &rsaquo; Field Permission Schemes.
      </p>
      <Select value={fieldPermissionSchemeId ?? NONE} onValueChange={(v) => void handleChange(v)}>
        <SelectTrigger className="w-64" aria-label="Field permission scheme">
          <SelectValue placeholder="None (no field restriction)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None (no field restriction)</SelectItem>
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
