import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Spinner } from '@/components/common/Spinner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/date'
import { isNotFoundError, toApiError } from '@/lib/error'
import { acceptInviteSchema, type AcceptInviteFormValues } from '@/schemas/auth.schema'
import { authService } from '@/services/auth.service'
import type { ProjectInvitePreview } from '@/types/project-invite.types'

const SIGN_IN_FOOTER = (
  <>
    Already have an account?{' '}
    <Link to="/login" className="font-medium text-primary hover:underline">
      Sign in
    </Link>
  </>
)

/** Public page behind an invitation link: sign in with the emailed temporary password. */
export function AcceptInvitePage() {
  const { token = '' } = useParams()
  const { user, acceptInvite, logout } = useAuth()

  const preview = useQuery({
    queryKey: ['invites', 'preview', token],
    queryFn: () => authService.previewInvite(token),
    retry: false,
  })

  if (preview.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading invitation" />
      </div>
    )
  }

  if (preview.isError || !preview.data) {
    return (
      <AuthLayout
        title="Invitation not found"
        subtitle={
          isNotFoundError(preview.error)
            ? 'This link is not valid. If the invitation was resent, use the newest email.'
            : toApiError(preview.error).message
        }
        footer={SIGN_IN_FOOTER}
      >
        <InviteLinkButton to="/login" label="Go to sign in" />
      </AuthLayout>
    )
  }

  const invite = preview.data
  if (invite.status !== 'Pending') {
    return (
      <AuthLayout
        title={STATUS_TITLES[invite.status]}
        subtitle={statusSubtitle(invite)}
        footer={SIGN_IN_FOOTER}
      >
        <InviteLinkButton to="/login" label="Go to sign in" />
      </AuthLayout>
    )
  }

  // Someone else is signed in on this browser - accepting would silently replace their session.
  if (user && !user.mustChangePassword) {
    return (
      <AuthLayout
        title="You're already signed in"
        subtitle={`Signed in as ${user.email}. Sign out to accept the invitation for ${invite.email}.`}
        footer={SIGN_IN_FOOTER}
      >
        <Button className="w-full" onClick={() => void logout()}>
          Sign out
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AcceptInviteForm
      token={token}
      invite={invite}
      onAccept={acceptInvite}
      onInviteChanged={() => void preview.refetch()}
    />
  )
}

const STATUS_TITLES = {
  Accepted: 'Invitation already accepted',
  Revoked: 'Invitation revoked',
  Expired: 'Invitation expired',
} as const

function statusSubtitle(invite: ProjectInvitePreview): string {
  const who =
    invite.inviterName ??
    (invite.scope === 'organization' ? 'your administrator' : 'the project owner')
  switch (invite.status) {
    case 'Accepted':
      return `Sign in with ${invite.email} and the password you chose.`
    case 'Revoked':
      return `This invitation to ${invite.projectName} was revoked. Ask ${who} for a new one.`
    default:
      return `This invitation to ${invite.projectName} expired on ${formatDateTime(invite.expiresAt)}. Ask ${who} to resend it.`
  }
}

function InviteLinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Button asChild className="w-full">
      <Link to={to}>{label}</Link>
    </Button>
  )
}

function AcceptInviteForm({
  token,
  invite,
  onAccept,
  onInviteChanged,
}: {
  token: string
  invite: ProjectInvitePreview
  onAccept?: (token: string, temporaryPassword: string) => Promise<void>
  /** The invite was revoked/expired/accepted since this page loaded - re-read its state. */
  onInviteChanged: () => void
}) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({ resolver: zodResolver(acceptInviteSchema) })

  async function onSubmit(values: AcceptInviteFormValues) {
    setFormError(null)
    try {
      await onAccept?.(token, values.temporaryPassword)
      navigate('/set-password', { replace: true })
    } catch (err) {
      const apiError = toApiError(err)
      // 410 = revoked/expired, 409 = already accepted: show that state's page instead of a form
      // that can no longer succeed.
      if (apiError.statusCode === 410 || apiError.statusCode === 409) onInviteChanged()
      else setFormError(apiError.message)
    }
  }

  return (
    <AuthLayout
      title={`Join ${invite.projectName}`}
      subtitle={`${invite.inviterName ?? 'Someone'} invited you${
        invite.organizationName ? ` to ${invite.organizationName}` : ''
      } as a ${invite.role}.`}
      footer={SIGN_IN_FOOTER}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </motion.div>
        )}

        <FormField label="Email" htmlFor="invite-email">
          <Input id="invite-email" value={invite.email} readOnly disabled />
        </FormField>

        <FormField
          label="Temporary password"
          htmlFor="temporaryPassword"
          error={errors.temporaryPassword?.message}
          hint="It's in your invitation email. You'll choose your own password next."
          required
        >
          <Input
            id="temporaryPassword"
            type="password"
            autoComplete="one-time-code"
            autoFocus
            {...register('temporaryPassword')}
          />
        </FormField>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Accept invitation
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Expires {formatDateTime(invite.expiresAt)}
        </p>
      </form>
    </AuthLayout>
  )
}
