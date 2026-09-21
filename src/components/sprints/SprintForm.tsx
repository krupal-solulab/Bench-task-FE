import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sprintSchema, type SprintFormValues } from '@/schemas/sprint.schema'
import { toDateInputValue } from '@/lib/date'
import { SPRINT_DURATION_WEEKS, type Sprint, type SprintDurationWeeks } from '@/types/sprint.types'

export interface SprintFormProps {
  initialValues?: Sprint
  onSubmit: (values: SprintFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

const CUSTOM_RANGE = 'custom'

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
      capacityPoints: initialValues?.capacityPoints ?? undefined,
    },
  })

  // Duration preset is local UI state (BRD 6.3), not itself part of the submitted payload -
  // "custom" shows the existing endDate picker; a preset instead sets durationWeeks and clears
  // endDate, so exactly one of the two is ever sent (see sprint.schema.ts's own comment).
  const [durationOption, setDurationOption] = useState<string>(CUSTOM_RANGE)

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  function handleDurationChange(value: string) {
    setDurationOption(value)
    if (value === CUSTOM_RANGE) {
      setValue('durationWeeks', undefined)
    } else {
      setValue('durationWeeks', Number(value) as SprintDurationWeeks, { shouldValidate: true })
      setValue('endDate', undefined, { shouldValidate: true })
    }
  }

  return (
    <form id="sprint-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" placeholder="Sprint 12" {...register('name')} />
      </FormField>

      <FormField label="Goal" htmlFor="goal" error={errors.goal?.message}>
        <Textarea id="goal" rows={3} {...register('goal')} />
      </FormField>

      <FormField label="Duration" htmlFor="duration">
        <Select value={durationOption} onValueChange={handleDurationChange}>
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPRINT_DURATION_WEEKS.map((weeks) => (
              <SelectItem key={weeks} value={String(weeks)}>
                {weeks} week{weeks > 1 ? 's' : ''}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_RANGE}>Custom range</SelectItem>
          </SelectContent>
        </Select>
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

        {durationOption === CUSTOM_RANGE && (
          <FormField label="End date" htmlFor="endDate" error={errors.endDate?.message} required>
            <DatePicker
              id="endDate"
              value={endDate}
              min={startDate || undefined}
              onChange={(v) => setValue('endDate', v ?? '', { shouldValidate: true })}
            />
          </FormField>
        )}
      </div>

      <FormField
        label="Capacity (story points)"
        htmlFor="capacityPoints"
        error={errors.capacityPoints?.message}
        hint="Optional - team capacity for this sprint, shown against planned points."
      >
        <Input
          id="capacityPoints"
          type="number"
          min={0}
          {...register('capacityPoints', {
            setValueAs: (v) => (v === '' ? undefined : Number(v)),
          })}
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
