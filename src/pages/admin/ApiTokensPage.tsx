import { useState } from 'react'
import { KeySquare } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { useOrgApiTokens } from '@/hooks/queries/useApiTokens'
import { useRevokeApiToken } from '@/hooks/mutations/useApiTokenMutations'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ApiToken } from '@/types/api-token.types'

function ownerLabel(owner: ApiToken['owner']): string {
  return typeof owner === 'string' ? 'Unknown user' : `${owner.name} (${owner.email})`
}

/** Module 11 gap-closure - every active personal API token in the org, revocable by an Admin. */
export function ApiTokensPage() {
  const { data: tokens, isLoading } = useOrgApiTokens()
  const revokeToken = useRevokeApiToken(true)
  const { showToast } = useToast()
  const [revoking, setRevoking] = useState<ApiToken | null>(null)

  async function handleRevoke() {
    if (!revoking) return
    try {
      await revokeToken.mutateAsync(revoking.id)
      showToast({ title: `"${revoking.name}" revoked`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not revoke the token',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API tokens"
        description="Personal tokens your members use for scripts and integrations. Each acts as its owner; revoke any that shouldn't be in use."
      />

      {!isLoading && (tokens ?? []).length === 0 && (
        <EmptyState
          icon={KeySquare}
          title="No active API tokens"
          description="Members create tokens from their Profile page."
        />
      )}

      {(tokens ?? []).length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Owner</th>
                <th className="p-3 font-medium">Created</th>
                <th className="p-3 font-medium">Expires</th>
                <th className="p-3 font-medium">Last used</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(tokens ?? []).map((token) => (
                <tr key={token.id}>
                  <td className="p-3">
                    <p className="font-medium">{token.name}</p>
                    <code className="text-xs text-muted-foreground">{token.prefix}…</code>
                  </td>
                  <td className="p-3">{ownerLabel(token.owner)}</td>
                  <td className="p-3">{formatDate(token.createdAt)}</td>
                  <td className="p-3">{token.expiresAt ? formatDate(token.expiresAt) : 'Never'}</td>
                  <td className="p-3">
                    {token.lastUsedAt ? formatDateTime(token.lastUsedAt) : 'Never'}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRevoking(token)}
                      aria-label={`Revoke ${token.name}`}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke "${revoking?.name ?? ''}"?`}
        description={`Anything using this token stops working immediately${
          revoking ? ` - ${ownerLabel(revoking.owner)} will need to create a new one` : ''
        }.`}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
      />
    </div>
  )
}
