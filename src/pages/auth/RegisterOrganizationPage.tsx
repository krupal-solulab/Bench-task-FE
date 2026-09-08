import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { isConflictError, toApiError } from '@/lib/error'
import {
  registerOrganizationSchema,
  type RegisterOrganizationFormValues,
} from '@/schemas/auth.schema'

export function RegisterOrganizationPage() {
  const { registerOrganization, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOrganizationFormValues>({ resolver: zodResolver(registerOrganizationSchema) })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: RegisterOrganizationFormValues) {
    setFormError(null)
    try {
      await registerOrganization({
        organizationName: values.organizationName,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (isConflictError(err)) {
        setError('adminEmail', { message: 'An account with this email already exists' })
        return
      }
      setFormError(toApiError(err).message)
    }
  }

  return (
    <AuthLayout
      title="Create your organization"
      subtitle="Get started in a few seconds"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
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

        <FormField
          label="Organization name"
          htmlFor="organizationName"
          error={errors.organizationName?.message}
          required
        >
          <Input
            id="organizationName"
            autoComplete="organization"
            {...register('organizationName')}
          />
        </FormField>

        <FormField
          label="Admin name"
          htmlFor="adminName"
          error={errors.adminName?.message}
          required
        >
          <Input id="adminName" autoComplete="name" {...register('adminName')} />
        </FormField>

        <FormField
          label="Admin email"
          htmlFor="adminEmail"
          error={errors.adminEmail?.message}
          required
        >
          <Input id="adminEmail" type="email" autoComplete="email" {...register('adminEmail')} />
        </FormField>

        <FormField
          label="Admin password"
          htmlFor="adminPassword"
          error={errors.adminPassword?.message}
          hint="At least 8 characters, with a letter and a number"
          required
        >
          <Input
            id="adminPassword"
            type="password"
            autoComplete="new-password"
            {...register('adminPassword')}
          />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        </FormField>

        <p className="text-xs text-muted-foreground">
          You&apos;ll be the Admin of your new organization.
        </p>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
