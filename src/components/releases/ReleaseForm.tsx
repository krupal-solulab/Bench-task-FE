import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { releaseSchema, type ReleaseFormValues } from '@/schemas/release.schema'
import { toDateInputValue } from '@/lib/date'
import type { Release } from '@/types/release.types'

export interface ReleaseFormProps {
  initialValues?: Release
  onSubmit: (values: ReleaseFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function ReleaseForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: ReleaseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      releaseDate: toDateInputValue(initialValues?.releaseDate ?? undefined),
    },
  })

  const releaseDate = watch('releaseDate')

  return (
    <form id="release-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" placeholder="v2.4.0" {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...register('description')} />
      </FormField>

      <FormField
        label="Target release date"
        htmlFor="releaseDate"
        error={errors.releaseDate?.message}
        hint="Optional - the planned ship date, shown until this release is actually released."
      >
        <DatePicker
          id="releaseDate"
          value={releaseDate}
          onChange={(v) => setValue('releaseDate', v ?? undefined, { shouldValidate: true })}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
