import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { TimeZoneSettings } from '@/components/profile/TimeZoneSettings'
import { DigestSettings } from '@/components/profile/DigestSettings'
import { ApiTokensSettings } from '@/components/profile/ApiTokensSettings'
import { useChangePassword, useUpdateProfile } from '@/hooks/mutations/useAuthMutations'
import { useUpdateNotificationPreferences } from '@/hooks/mutations/useNotificationMutations'
import { useNotificationPreferences } from '@/hooks/queries/useNotifications'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/notifications'
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordFormValues,
  type UpdateProfileFormValues,
} from '@/schemas/auth.schema'
import { NOTIFICATION_TYPES, type NotificationType } from '@/types/notification.types'

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const changePassword = useChangePassword()
  const updateProfile = useUpdateProfile()
  const { data: preferences } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const mutedTypes = preferences?.mutedTypes ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) })

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: {
      errors: profileErrors,
      isSubmitting: isProfileSubmitting,
      isDirty: isProfileDirty,
    },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  })

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

  async function onProfileSubmit(values: UpdateProfileFormValues) {
    try {
      const updated = await updateProfile.mutateAsync(values)
      updateUser(updated)
      showToast({ title: 'Profile updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update profile',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function toggleMuted(type: NotificationType) {
    const next = mutedTypes.includes(type)
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type]
    try {
      await updatePreferences.mutateAsync({ mutedTypes: next })
    } catch (err) {
      showToast({
        title: 'Could not update notification preferences',
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
          <h2 className="font-medium">Name &amp; email</h2>
          <p className="text-sm text-muted-foreground">Update your own display name and email.</p>
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4" noValidate>
          <FormField label="Name" htmlFor="name" error={profileErrors.name?.message} required>
            <Input id="name" {...registerProfile('name')} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={profileErrors.email?.message} required>
            <Input id="email" type="email" {...registerProfile('email')} />
          </FormField>

          <Button type="submit" loading={isProfileSubmitting} disabled={!isProfileDirty}>
            Save changes
          </Button>
        </form>
      </section>

      <TimeZoneSettings />

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-medium">Notification preferences</h2>
          <p className="text-sm text-muted-foreground">Choose which notifications you receive.</p>
        </div>

        <DigestSettings />

        <div className="space-y-2.5">
          {NOTIFICATION_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={!mutedTypes.includes(type)}
                onCheckedChange={() => void toggleMuted(type)}
              />
              {NOTIFICATION_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </section>

      <ApiTokensSettings />

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
