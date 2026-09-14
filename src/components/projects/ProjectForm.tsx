import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { projectSchema, type ProjectFormValues } from '@/schemas/project.schema'
import { toDateInputValue } from '@/lib/date'
import type { Project } from '@/types/project.types'

export interface ProjectFormProps {
  initialValues?: Project
  onSubmit: (values: ProjectFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function ProjectForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      // null (not '') when unset - startDate/dueDate are optional at the API, and an empty
      // string (rather than null/undefined) would fail its @IsISO8601() validation on submit.
      startDate: initialValues?.startDate ? toDateInputValue(initialValues.startDate) : null,
      dueDate: initialValues?.dueDate ? toDateInputValue(initialValues.dueDate) : null,
    },
  })

  const startDate = watch('startDate')
  const dueDate = watch('dueDate')

  return (
    <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={4} {...register('description')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
          <DatePicker
            id="startDate"
            value={startDate}
            onChange={(v) => setValue('startDate', v, { shouldValidate: true })}
          />
        </FormField>

        <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate?.message}>
          <DatePicker
            id="dueDate"
            value={dueDate}
            min={startDate ?? undefined}
            onChange={(v) => setValue('dueDate', v, { shouldValidate: true })}
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
