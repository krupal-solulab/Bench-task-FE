import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { RoleChoiceSelect } from './RoleChoiceSelect'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { fromRoleChoice, roleChoiceLabel, type RoleChoice } from '@/lib/roles'
import { useBulkUpdateUserRole, useBulkUpdateUserStatus } from '@/hooks/mutations/useUserMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { BulkUserResult } from '@/types/user.types'

type PendingAction =
  { kind: 'role'; choice: RoleChoice } | { kind: 'status'; isActive: boolean } | null

export interface UserBulkActionBarProps {
  selectedIds: Set<string>
  onDone: () => void
}

/** Module 8 gap-closure - bulk role change / activate / deactivate for the selected users.
 * Mirrors the Backlog's BulkActionBar: a ConfirmDialog for every change, and a partial-success
 * toast ("X succeeded, Y failed") since the server applies each user independently. */
export function UserBulkActionBar({ selectedIds, onDone }: UserBulkActionBarProps) {
  const [pending, setPending] = useState<PendingAction>(null)
  const bulkRole = useBulkUpdateUserRole()
  const bulkStatus = useBulkUpdateUserStatus()
  const { data: customRoles } = useCustomRoles()
  const { showToast } = useToast()
  const count = selectedIds.size
  const userIds = [...selectedIds]

  function report(action: string, result: BulkUserResult) {
    if (result.failed.length > 0) {
      showToast({
        title: `${action}: ${result.succeeded.length} succeeded, ${result.failed.length} failed`,
        description: result.failed[0]!.message,
        variant: 'destructive',
      })
    } else {
      showToast({
        title: `${action}: ${result.succeeded.length} user(s) updated`,
        variant: 'success',
      })
    }
    onDone()
  }

  async function confirm() {
    if (!pending) return
    try {
      if (pending.kind === 'role') {
        report(
          'Role change',
          await bulkRole.mutateAsync({
            userIds,
            change: fromRoleChoice(pending.choice, customRoles),
          }),
        )
      } else {
        report(
          pending.isActive ? 'Activate' : 'Deactivate',
          await bulkStatus.mutateAsync({ userIds, isActive: pending.isActive }),
        )
      }
    } catch (err) {
      showToast({
        title: 'Bulk update failed',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  const description =
    pending?.kind === 'role'
      ? `Change the role of ${count} user(s) to ${roleChoiceLabel(pending.choice, customRoles)}?`
      : pending?.kind === 'status' && pending.isActive
        ? `Activate ${count} user(s)?`
        : `Deactivate ${count} user(s)? They will be signed out and unable to log in.`

  return (
    <div
      role="region"
      aria-label="Bulk user actions"
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2"
    >
      <span className="text-sm font-medium">{count} selected</span>
      <RoleChoiceSelect
        value=""
        onChange={(choice) => setPending({ kind: 'role', choice })}
        className="w-44"
        ariaLabel="Change role to"
        placeholder="Change role to…"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPending({ kind: 'status', isActive: true })}
      >
        Activate
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPending({ kind: 'status', isActive: false })}
      >
        Deactivate
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        Clear selection
      </Button>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title="Apply bulk change"
        description={description}
        confirmLabel="Apply"
        variant={pending?.kind === 'status' && !pending.isActive ? 'destructive' : 'default'}
        onConfirm={confirm}
      />
    </div>
  )
}
