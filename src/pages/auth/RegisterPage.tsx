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
import { registerSchema, type RegisterFormValues } from '@/schemas/auth.schema'

export function RegisterPage() {
  const { register: registerUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    try {
      await registerUser({ name: values.name, email: values.email, password: values.password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (isConflictError(err)) {
        setError('email', { message: 'An account with this email already exists' })
        return
      }
      setFormError(toApiError(err).message)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
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

        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...register('name')} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number"
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
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
          New accounts are created as Developer. An Admin can assign a different role later.
        </p>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
