import { useState } from 'react'
import { Check, Copy, Eye, EyeOff, MailCheck, MailWarning } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/date'
import type { SentProjectInvite } from '@/types/project-invite.types'

/**
 * The one moment an invite's link and temporary password are visible: right after it is sent or
 * resent. Only hashes are stored, so once this closes the way to get new ones is Resend.
 */
export function InviteSecretsPanel({ sent }: { sent: SentProjectInvite }) {
  const { invite, inviteUrl, temporaryPassword, emailSent } = sent

  return (
    <div className="space-y-4">
      <div
        role="status"
        className={
          emailSent
            ? 'flex gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm'
            : 'flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm'
        }
      >
        {emailSent ? (
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>
          {emailSent
            ? `Invitation emailed to ${invite.email}. You can also share the details below.`
            : `The email could not be sent - share the link and temporary password with ${invite.email} yourself.`}
        </span>
      </div>

      <SecretField label="Invitation link" value={inviteUrl} />
      <SecretField label="Temporary password" value={temporaryPassword} masked />

      <CopyAllButton
        text={`You're invited to join the project.\nLink: ${inviteUrl}\nEmail: ${invite.email}\nTemporary password: ${temporaryPassword}`}
      />

      <p className="text-xs text-muted-foreground">
        Expires {formatDateTime(invite.expiresAt)}. These details are shown only now - use Resend
        later to issue new ones. After signing in they add their name and set their own password.
      </p>
    </div>
  )
}

function SecretField({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [revealed, setRevealed] = useState(!masked)
  const id = `secret-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          readOnly
          type={revealed ? 'text' : 'password'}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-muted/40 px-3 font-mono text-sm"
        />
        {masked && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        )}
        <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  )
}

function useCopy() {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast({
        title: 'Could not copy - select the text and copy it manually',
        variant: 'destructive',
      })
    }
  }
  return { copied, copy }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy()
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-9 w-9 shrink-0"
      aria-label={label}
      onClick={() => void copy(text)}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}

function CopyAllButton({ text }: { text: string }) {
  const { copied, copy } = useCopy()
  return (
    <Button type="button" variant="secondary" className="w-full" onClick={() => void copy(text)}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy invitation details'}
    </Button>
  )
}
