import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { toApiError } from '@/lib/error'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const returnTo = new URLSearchParams(location.search).get('returnTo')

  if (isAuthenticated) {
    return <Navigate to={returnTo || '/dashboard'} replace />
  }

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      await login(values)
      navigate(returnTo || '/dashboard', { replace: true })
    } catch (err) {
      const apiError = toApiError(err)
      setFormError(apiError.statusCode === 401 ? 'Invalid email or password' : apiError.message)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register
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

        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        </FormField>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
