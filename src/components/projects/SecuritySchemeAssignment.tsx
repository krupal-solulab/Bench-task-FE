import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSecuritySchemes } from '@/hooks/queries/useSecuritySchemes'
import { useAssignSecurityScheme } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'

const NONE = '__none__'

export interface SecuritySchemeAssignmentProps {
  projectId: string
  securitySchemeId: string | null
  canManage: boolean
}

/** Assigns (or unassigns) one of the organization's reusable security schemes to this project -
 * schemes themselves are created/edited on the Admin-only Security Schemes page. Unassigning
 * means every issue on this project is viewable by any project member again, regardless of any
 * securityLevel left set on individual tasks. */
export function SecuritySchemeAssignment({
  projectId,
  securitySchemeId,
  canManage,
}: SecuritySchemeAssignmentProps) {
  const { data: schemes } = useSecuritySchemes()
  const assignScheme = useAssignSecurityScheme(projectId)
  const { showToast } = useToast()

  const current = schemes?.find((s) => s.id === securitySchemeId)

  async function handleChange(value: string) {
    try {
      await assignScheme.mutateAsync(value === NONE ? null : value)
      showToast({ title: 'Security scheme updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update security scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Security scheme</h3>
        <p className="text-sm text-muted-foreground">
          {current ? current.name : 'No scheme assigned - no issue-level view restriction.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Security scheme</h3>
      <p className="text-sm text-muted-foreground">
        Assign a scheme to restrict who can view specific issues on this project, beyond project
        membership. Manage schemes themselves from Admin &rsaquo; Security Schemes.
      </p>
      <Select value={securitySchemeId ?? NONE} onValueChange={(v) => void handleChange(v)}>
        <SelectTrigger className="w-64" aria-label="Security scheme">
          <SelectValue placeholder="None (no view restriction)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None (no view restriction)</SelectItem>
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
