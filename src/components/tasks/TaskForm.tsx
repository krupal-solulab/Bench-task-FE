import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { UserSelect } from '@/components/common/UserSelect'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { taskSchema, type TaskFormValues } from '@/schemas/task.schema'
import { TASK_PRIORITIES, type Task } from '@/types/task.types'

export interface TaskFormProps {
  projectId: string
  memberIds?: string[]
  initialValues?: Task
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function TaskForm({
  projectId,
  memberIds,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      project: projectId,
      assignee: initialValues?.assignee?.id ?? null,
      priority: initialValues?.priority ?? 'P2',
      dueDate: initialValues?.dueDate ?? null,
    },
  })

  const dueDate = watch('dueDate')
  const assignee = watch('assignee')
  const priority = watch('priority')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Title" htmlFor="title" error={errors.title?.message} required>
        <Input id="title" {...register('title')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={4} {...register('description')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Priority" htmlFor="priority" error={errors.priority?.message} required>
          <Select
            value={priority}
            onValueChange={(v) => setValue('priority', v as TaskFormValues['priority'])}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate?.message}>
          <DatePicker id="dueDate" value={dueDate} onChange={(v) => setValue('dueDate', v)} />
        </FormField>
      </div>

      <FormField label="Assignee" htmlFor="assignee" error={errors.assignee?.message}>
        <UserSelect
          id="assignee"
          value={assignee ?? null}
          onChange={(v) => setValue('assignee', v)}
          memberIds={memberIds}
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
