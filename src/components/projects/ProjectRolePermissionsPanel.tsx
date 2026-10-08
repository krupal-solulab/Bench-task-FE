import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/useToast'
import { queryKeys } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { toApiError } from '@/lib/error'
import { PERMISSION_LABELS, ROLE_COLOR_CLASSES } from '@/lib/roles'
import { projectsService } from '@/services/projects.service'
import type { MemberPermissions, ProjectRolePermissionRow } from '@/types/project.types'

/**
 * Jira-style per-project role permissions: every role of the organization with what it may do in
 * THIS project. Admins can override a role here only (other projects keep the role's defaults)
 * and reset it back; everyone else sees it read-only.
 */
export function ProjectRolePermissionsPanel({
  projectId,
  canEdit,
}: {
  projectId: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const key = queryKeys.projects.rolePermissions(projectId)
  const { data: rows, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => projectsService.rolePermissions(projectId),
  })

  const onDone = (rowsAfter: ProjectRolePermissionRow[]) => {
    queryClient.setQueryData(key, rowsAfter)
    // The signed-in user's own effective permissions in this project may have changed.
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
  }
  const setOverride = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: MemberPermissions }) =>
      projectsService.setRolePermissionOverride(projectId, roleId, permissions),
    onSuccess: onDone,
  })
  const resetOverride = useMutation({
    mutationFn: (roleId: string) => projectsService.resetRolePermissionOverride(projectId, roleId),
    onSuccess: onDone,
  })

  async function toggle(row: ProjectRolePermissionRow, perm: keyof MemberPermissions, on: boolean) {
    try {
      await setOverride.mutateAsync({
        roleId: row.roleId,
        permissions: { ...row.effective, [perm]: on },
      })
      showToast({ title: `${row.name}: permissions updated for this project`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update role permissions',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function reset(row: ProjectRolePermissionRow) {
    try {
      await resetOverride.mutateAsync(row.roleId)
      showToast({ title: `${row.name} uses its organization defaults again`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reset role permissions',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <section
      className="space-y-3 rounded-xl border bg-card p-5 shadow-soft"
      aria-labelledby="role-perms-heading"
    >
      <div>
        <h3 id="role-perms-heading" className="font-semibold">
          Role permissions in this project
        </h3>
        <p className="text-sm text-muted-foreground">
          What each role may do here. Roles use their organization defaults (Admin › Roles) unless{' '}
          {canEdit ? 'you change them' : 'an Admin changes them'} for this project only. Admins
          always have every permission.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Role</th>
                {PERMISSION_LABELS.map((p) => (
                  <th key={p.key} className="px-2 py-2 text-center font-medium" title={p.hint}>
                    {p.label}
                  </th>
                ))}
                <th className="py-2 pl-2" />
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr key={row.roleId} className="border-b last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          ROLE_COLOR_CLASSES[row.color].dot,
                        )}
                        aria-hidden
                      />
                      <span className="font-medium">{row.name}</span>
                      {row.override ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Custom here
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Org default</span>
                      )}
                    </div>
                  </td>
                  {PERMISSION_LABELS.map((p) => (
                    <td key={p.key} className="px-2 py-2.5 text-center">
                      <Checkbox
                        checked={row.effective[p.key]}
                        disabled={!canEdit || setOverride.isPending}
                        onCheckedChange={(v) => void toggle(row, p.key, v === true)}
                        aria-label={`${row.name}: ${p.label}`}
                      />
                    </td>
                  ))}
                  <td className="py-2.5 pl-2 text-right">
                    {canEdit && row.override && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void reset(row)}
                        aria-label={`Reset ${row.name} to organization defaults`}
                      >
                        <RotateCcw /> Reset
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
