import { useState } from 'react'
import { Mail, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useProjectInvites } from '@/hooks/queries/useProjectInvites'
import {
  useResendProjectInvite,
  useRevokeProjectInvite,
} from '@/hooks/mutations/useProjectInviteMutations'
import { useOrganizationInvites } from '@/hooks/queries/useOrganizationInvites'
import {
  useResendOrganizationInvite,
  useRevokeOrganizationInvite,
} from '@/hooks/mutations/useOrganizationInviteMutations'
import { useToast } from '@/hooks/useToast'
import { formatRelativeTime } from '@/lib/date'
import { customRoleChoice, roleChoiceLabel } from '@/lib/roles'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { toApiError } from '@/lib/error'
import type { ProjectInvite, SentProjectInvite } from '@/types/project-invite.types'

/** Invitations still waiting on someone (pending or expired), with Resend / Revoke. Accepted
 * ones show up as members/users instead; revoked ones are gone from view. Without a `projectId`
 * it lists the organization's own invitations (Admin > Users). */
export function PendingInvitesList({
  projectId,
  canManage,
  onResent,
}: {
  projectId?: string
  canManage: boolean
  onResent: (sent: SentProjectInvite) => void
}) {
  const isProject = !!projectId
  const projectInvites = useProjectInvites(projectId ?? '', canManage && isProject)
  const orgInvites = useOrganizationInvites(canManage && !isProject)
  const invites = isProject ? projectInvites : orgInvites
  const { data: customRoles } = useCustomRoles(canManage)
  const resendProject = useResendProjectInvite(projectId ?? '')
  const revokeProject = useRevokeProjectInvite(projectId ?? '')
  const resendOrg = useResendOrganizationInvite()
  const revokeOrg = useRevokeOrganizationInvite()
  const resend = isProject ? resendProject : resendOrg
  const revoke = isProject ? revokeProject : revokeOrg
  const { showToast } = useToast()
  const [revokeTarget, setRevokeTarget] = useState<ProjectInvite | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const waiting = (invites.data ?? []).filter(
    (i) => i.status === 'Pending' || i.status === 'Expired',
  )
  if (!canManage || waiting.length === 0) return null

  async function handleResend(invite: ProjectInvite) {
    setResendingId(invite.id)
    try {
      onResent(await resend.mutateAsync(invite.id))
    } catch (err) {
      showToast({
        title: 'Could not resend invitation',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setResendingId(null)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    try {
      await revoke.mutateAsync(revokeTarget.id)
      showToast({ title: 'Invitation revoked', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not revoke invitation',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="space-y-2" aria-labelledby="pending-invites-heading">
      <h4 id="pending-invites-heading" className="text-sm font-medium text-muted-foreground">
        Pending invitations ({waiting.length})
      </h4>
      <ul className="space-y-2">
        {waiting.map((invite) => {
          const expired = invite.status === 'Expired'
          return (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight">
                    {invite.email}
                    {invite.name && (
                      <span className="font-normal text-muted-foreground"> · {invite.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invite.customRoleId
                      ? roleChoiceLabel(customRoleChoice(invite.customRoleId), customRoles)
                      : invite.role}{' '}
                    ·{' '}
                    <span className={expired ? 'font-medium text-destructive' : undefined}>
                      {expired
                        ? `Expired ${formatRelativeTime(invite.expiresAt)}`
                        : `Expires ${formatRelativeTime(invite.expiresAt)}`}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleResend(invite)}
                  loading={resendingId === invite.id}
                  aria-label={`Resend invitation to ${invite.email}`}
                >
                  {resendingId !== invite.id && <RotateCw />}
                  Resend
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setRevokeTarget(invite)}
                  aria-label={`Revoke invitation to ${invite.email}`}
                >
                  <X />
                  Revoke
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke invitation"
        description={`${revokeTarget?.email} will no longer be able to join with this invitation or its temporary password.`}
        variant="destructive"
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
      />
    </section>
  )
}
