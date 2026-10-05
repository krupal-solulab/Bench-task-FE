import { useState, type FormEvent } from 'react'
import { Copy, KeySquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { useMyApiTokens } from '@/hooks/queries/useApiTokens'
import { useCreateApiToken, useRevokeApiToken } from '@/hooks/mutations/useApiTokenMutations'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ApiToken, ApiTokenExpiryDays } from '@/types/api-token.types'

const EXPIRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never' },
]

function toExpiryDays(value: string): ApiTokenExpiryDays {
  return value === 'never' ? null : (Number(value) as ApiTokenExpiryDays)
}

/**
 * Module 11 gap-closure - personal API tokens for scripts and integrations. A token acts as you
 * (same role and access); its secret is shown only once, right after it's created.
 */
export function ApiTokensSettings() {
  const { data: tokens } = useMyApiTokens()
  const createToken = useCreateApiToken()
  const revokeToken = useRevokeApiToken()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('90')
  const [created, setCreated] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<ApiToken | null>(null)
  const trimmed = name.trim()

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    try {
      const result = await createToken.mutateAsync({
        name: trimmed,
        expiresInDays: toExpiryDays(expiry),
      })
      setCreated(result.token)
      setName('')
    } catch (err) {
      showToast({
        title: 'Could not create the token',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleCopy() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created)
      showToast({ title: 'Token copied', variant: 'success' })
    } catch {
      showToast({ title: 'Copy failed - select the token and copy it', variant: 'destructive' })
    }
  }

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
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-soft">
      <div>
        <h2 className="font-medium">API tokens</h2>
        <p className="text-sm text-muted-foreground">
          Use a token as <code className="text-xs">Authorization: Bearer &lt;token&gt;</code> for
          scripts and integrations. It acts as you, with your role and access, but can't change your
          password, profile or tokens.
        </p>
      </div>

      {created && (
        <div
          role="status"
          className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40"
        >
          <p className="font-medium">
            Copy your new token now - you won't be able to see it again.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              aria-label="New API token"
              value={created}
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button type="button" variant="outline" className="gap-1" onClick={handleCopy}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(null)}>
            Done
          </Button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3" noValidate>
        <FormField label="Token name" htmlFor="api-token-name" className="min-w-48 flex-1">
          <Input
            id="api-token-name"
            value={name}
            maxLength={60}
            placeholder="e.g. CI pipeline"
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Expires" htmlFor="api-token-expiry">
          <select
            id="api-token-expiry"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit" loading={createToken.isPending} disabled={!trimmed}>
          Create token
        </Button>
      </form>

      {(tokens ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no API tokens.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(tokens ?? []).map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <KeySquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{token.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{token.prefix}…</code> ·{' '}
                    {token.expiresAt ? `expires ${formatDate(token.expiresAt)}` : 'never expires'} ·{' '}
                    {token.lastUsedAt
                      ? `last used ${formatDateTime(token.lastUsedAt)}`
                      : 'never used'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevoking(token)}
                aria-label={`Revoke ${token.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke "${revoking?.name ?? ''}"?`}
        description="Anything using this token will stop working immediately. This can't be undone."
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
      />
    </section>
  )
}
