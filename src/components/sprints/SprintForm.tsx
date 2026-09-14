import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sprintSchema, type SprintFormValues } from '@/schemas/sprint.schema'
import { toDateInputValue } from '@/lib/date'
import type { Sprint } from '@/types/sprint.types'

export interface SprintFormProps {
  initialValues?: Sprint
  onSubmit: (values: SprintFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function SprintForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: SprintFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(sprintSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      goal: initialValues?.goal ?? '',
      startDate: toDateInputValue(initialValues?.startDate),
      endDate: toDateInputValue(initialValues?.endDate),
    },
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  return (
    <form id="sprint-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" placeholder="Sprint 12" {...register('name')} />
      </FormField>

      <FormField label="Goal" htmlFor="goal" error={errors.goal?.message}>
        <Textarea id="goal" rows={3} {...register('goal')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Start date"
          htmlFor="startDate"
          error={errors.startDate?.message}
          required
        >
          <DatePicker
            id="startDate"
            value={startDate}
            onChange={(v) => setValue('startDate', v ?? '', { shouldValidate: true })}
          />
        </FormField>

        <FormField label="End date" htmlFor="endDate" error={errors.endDate?.message} required>
          <DatePicker
            id="endDate"
            value={endDate}
            min={startDate || undefined}
            onChange={(v) => setValue('endDate', v ?? '', { shouldValidate: true })}
          />
        </FormField>
      </div>

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
