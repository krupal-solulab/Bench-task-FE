import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import {
  createOrganizationSchema,
  type CreateOrganizationFormValues,
} from '@/schemas/organization.schema'

export function OrganizationForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: CreateOrganizationFormValues) => Promise<void>
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationFormValues>({ resolver: zodResolver(createOrganizationSchema) })

  async function submit(values: CreateOrganizationFormValues) {
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_EMAIL') {
        setError('adminEmail', { message: 'An account with this email already exists' })
        return
      }
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormField
        label="Organization name"
        htmlFor="organizationName"
        error={errors.organizationName?.message}
        required
      >
        <Input id="organizationName" {...register('organizationName')} />
      </FormField>

      <FormField label="Admin name" htmlFor="adminName" error={errors.adminName?.message} required>
        <Input id="adminName" {...register('adminName')} />
      </FormField>

      <FormField
        label="Admin email"
        htmlFor="adminEmail"
        error={errors.adminEmail?.message}
        required
      >
        <Input id="adminEmail" type="email" {...register('adminEmail')} />
      </FormField>

      <FormField
        label="Admin password"
        htmlFor="adminPassword"
        error={errors.adminPassword?.message}
        hint="At least 8 characters, with a letter and a number"
        required
      >
        <Input id="adminPassword" type="password" {...register('adminPassword')} />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create organization
        </Button>
      </div>
    </form>
  )
}
