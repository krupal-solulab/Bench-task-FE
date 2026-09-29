import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { workLogSchema, type WorkLogFormValues } from '@/schemas/worklog.schema'
import { toDateInputValue } from '@/lib/date'
import { formatHoursAsShorthand, parseDurationShorthand } from '@/lib/duration'
import type { WorkLog } from '@/types/worklog.types'

export interface LogWorkFormProps {
  initialValues?: WorkLog
  onSubmit: (values: WorkLogFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function LogWorkForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Log work',
}: LogWorkFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkLogFormValues>({
    resolver: zodResolver(workLogSchema),
    defaultValues: {
      hours: initialValues?.hours ?? 1,
      description: initialValues?.description ?? '',
      workDate:
        toDateInputValue(initialValues?.workDate) || toDateInputValue(new Date().toISOString()),
      billable: initialValues?.billable ?? true,
    },
  })

  const workDate = watch('workDate')
  const billable = watch('billable')
  // A free-text buffer, not itself validated - `hours` (the real, numeric form field) is only
  // ever updated via setValue below, so a garbled in-progress edit like "2h 3" never reaches the
  // schema until it parses to a real duration. Seeded from the stored decimal so editing an
  // existing entry shows its shorthand form, not a raw number.
  const [hoursText, setHoursText] = useState(() =>
    initialValues ? formatHoursAsShorthand(initialValues.hours) : '',
  )

  function handleHoursChange(text: string) {
    setHoursText(text)
    const parsed = parseDurationShorthand(text)
    // NaN deliberately reaches the existing `hours: z.number()...` validation as a type failure -
    // no separate "couldn't parse" error path needed, the hint below explains the accepted formats.
    setValue('hours', parsed ?? NaN, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Hours"
          htmlFor="hours"
          error={errors.hours?.message}
          hint="e.g. 2h 30m, 1d, or 2.5"
          required
        >
          <Input
            id="hours"
            type="text"
            inputMode="text"
            value={hoursText}
            onChange={(e) => handleHoursChange(e.target.value)}
          />
        </FormField>

        <FormField label="Date" htmlFor="workDate" error={errors.workDate?.message} required>
          <DatePicker
            id="workDate"
            value={workDate}
            onChange={(v) => setValue('workDate', v ?? '', { shouldValidate: true })}
          />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...register('description')} />
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={billable}
          onCheckedChange={(checked) => setValue('billable', checked === true)}
        />
        Billable
      </label>

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
