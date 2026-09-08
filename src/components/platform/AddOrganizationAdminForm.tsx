import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import {
  addOrganizationAdminSchema,
  type AddOrganizationAdminFormValues,
} from '@/schemas/organization.schema'

export function AddOrganizationAdminForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: AddOrganizationAdminFormValues) => Promise<void>
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddOrganizationAdminFormValues>({ resolver: zodResolver(addOrganizationAdminSchema) })

  async function submit(values: AddOrganizationAdminFormValues) {
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_EMAIL') {
        setError('email', { message: 'An account with this email already exists' })
        return
      }
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="admin-name" error={errors.name?.message} required>
        <Input id="admin-name" {...register('name')} />
      </FormField>

      <FormField label="Email" htmlFor="admin-email" error={errors.email?.message} required>
        <Input id="admin-email" type="email" {...register('email')} />
      </FormField>

      <FormField
        label="Password"
        htmlFor="admin-password"
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number"
        required
      >
        <Input id="admin-password" type="password" {...register('password')} />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Add admin
        </Button>
      </div>
    </form>
  )
}
