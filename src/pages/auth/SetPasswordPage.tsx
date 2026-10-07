import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { setInitialPasswordSchema, type SetInitialPasswordFormValues } from '@/schemas/auth.schema'

/**
 * Where an account created from a project invite lands after signing in with its temporary
 * password - ProtectedRoute sends it here until a password of its own is set (the server refuses
 * everything else meanwhile too).
 */
export function SetPasswordPage() {
  const { user, setInitialPassword, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetInitialPasswordFormValues>({ resolver: zodResolver(setInitialPasswordSchema) })

  if (!user?.mustChangePassword) return <Navigate to="/dashboard" replace />

  async function onSubmit(values: SetInitialPasswordFormValues) {
    setFormError(null)
    try {
      await setInitialPassword?.(values.name, values.newPassword)
      showToast({
        title: `Welcome, ${values.name}!`,
        description: 'Your account is ready.',
        variant: 'success',
      })
      navigate('/projects', { replace: true })
    } catch (err) {
      setFormError(toApiError(err).message)
    }
  }

  return (
    <AuthLayout
      title="Complete your account"
      subtitle={`Signed in as ${user.email}. Add your name and choose a password to replace your temporary one.`}
      footer={
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      }
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

        <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...register('name')} />
        </FormField>

        <FormField
          label="New password"
          htmlFor="newPassword"
          error={errors.newPassword?.message}
          hint="At least 8 characters, with a letter and a number."
          required
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />
        </FormField>

        <FormField
          label="Confirm new password"
          htmlFor="confirmNewPassword"
          error={errors.confirmNewPassword?.message}
          required
        >
          <Input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmNewPassword')}
          />
        </FormField>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Complete account
        </Button>
      </form>
    </AuthLayout>
  )
}
