import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import {
  organizationSettingsSchema,
  type OrganizationSettingsFormValues,
} from '@/schemas/organization.schema'
import type {
  OrganizationSettings,
  UpdateOrganizationSettingsPayload,
} from '@/types/organization.types'

export function OrganizationSettingsForm({
  organization,
  onSubmit,
}: {
  organization: OrganizationSettings
  onSubmit: (payload: UpdateOrganizationSettingsPayload) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrganizationSettingsFormValues>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: organization.name,
      timezone: organization.timezone,
      logoUrl: organization.logoUrl ?? '',
    },
  })

  // The page's query can (re)resolve after this form has already mounted (e.g. a background
  // refetch) - keep the form's draft in sync with the latest server values whenever that happens.
  useEffect(() => {
    reset({
      name: organization.name,
      timezone: organization.timezone,
      logoUrl: organization.logoUrl ?? '',
    })
  }, [organization, reset])

  async function submit(values: OrganizationSettingsFormValues) {
    await onSubmit({
      name: values.name,
      timezone: values.timezone,
      logoUrl: values.logoUrl || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormField label="Organization name" htmlFor="org-name" error={errors.name?.message} required>
        <Input id="org-name" {...register('name')} />
      </FormField>

      <FormField
        label="Timezone"
        htmlFor="org-timezone"
        error={errors.timezone?.message}
        hint="An IANA timezone name, e.g. America/New_York"
        required
      >
        <Input id="org-timezone" {...register('timezone')} />
      </FormField>

      <FormField
        label="Logo URL"
        htmlFor="org-logo-url"
        error={errors.logoUrl?.message}
        hint="Leave blank to use the default logo"
      >
        <Input id="org-logo-url" placeholder="https://…" {...register('logoUrl')} />
      </FormField>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
