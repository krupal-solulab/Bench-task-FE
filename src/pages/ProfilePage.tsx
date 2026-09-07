import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useChangePassword } from '@/hooks/mutations/useAuthMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schemas/auth.schema'

export function ProfilePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) })

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      showToast({
        title: 'Password changed',
        description: 'Other sessions have been signed out.',
        variant: 'success',
      })
      reset()
    } catch (err) {
      showToast({
        title: 'Could not change password',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader
        title="Profile"
        description="View your account details and change your password"
      />

      <section className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-soft">
        <Avatar name={user.name} size="lg" className="h-14 w-14 text-lg" />
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{user.name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {user.role}
            </span>
          </dd>
        </dl>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-medium">Change password</h2>
          <p className="text-sm text-muted-foreground">
            Changing your password signs out all of your other sessions.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="Current password"
            htmlFor="currentPassword"
            error={errors.currentPassword?.message}
            required
          >
            <Input id="currentPassword" type="password" {...register('currentPassword')} />
          </FormField>

          <FormField
            label="New password"
            htmlFor="newPassword"
            error={errors.newPassword?.message}
            hint="At least 8 characters, with a letter and a number"
            required
          >
            <Input id="newPassword" type="password" {...register('newPassword')} />
          </FormField>

          <FormField
            label="Confirm new password"
            htmlFor="confirmNewPassword"
            error={errors.confirmNewPassword?.message}
            required
          >
            <Input id="confirmNewPassword" type="password" {...register('confirmNewPassword')} />
          </FormField>

          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  )
}
