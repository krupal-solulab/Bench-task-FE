import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { UserSelect } from '@/components/common/UserSelect'
import { IssuePicker } from '@/components/tasks/IssuePicker'
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
import { ISSUE_TYPES, STANDARD_ISSUE_TYPES, TASK_PRIORITIES, type Task } from '@/types/task.types'

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
      issueType: initialValues?.issueType ?? 'Task',
      parent: initialValues?.parent?.id ?? null,
      storyPoints: initialValues?.storyPoints ?? null,
    },
  })

  const dueDate = watch('dueDate')
  const assignee = watch('assignee')
  const priority = watch('priority')
  const issueType = watch('issueType') ?? 'Task'
  const parent = watch('parent')
  const storyPoints = watch('storyPoints')

  // Hierarchy position is fixed at creation - the API doesn't accept issueType/parent changes on
  // an existing issue, so editing shows it read-only instead of a control nothing would apply.
  const isEditingExisting = !!initialValues
  const isStandardIssue = STANDARD_ISSUE_TYPES.includes(issueType)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Title" htmlFor="title" error={errors.title?.message} required>
        <Input id="title" {...register('title')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={4} {...register('description')} />
      </FormField>

      {isEditingExisting ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{issueType}</span>
          {initialValues?.issueKey && ` · ${initialValues.issueKey}`}
          {initialValues?.parent &&
            ` · ${issueType === 'Sub-task' ? 'Parent' : 'Epic'}: ${initialValues.parent.issueKey ?? initialValues.parent.title}`}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Issue type"
            htmlFor="issueType"
            error={errors.issueType?.message}
            required
          >
            <Select
              value={issueType}
              onValueChange={(v) => {
                setValue('issueType', v as TaskFormValues['issueType'])
                setValue('parent', null)
              }}
            >
              <SelectTrigger id="issueType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {issueType === 'Sub-task' && (
            <FormField
              label="Parent issue"
              htmlFor="parent"
              error={errors.parent?.message}
              required
            >
              <IssuePicker
                id="parent"
                projectId={projectId}
                issueTypes={STANDARD_ISSUE_TYPES}
                value={parent ?? null}
                onChange={(v) => setValue('parent', v, { shouldValidate: true })}
                placeholder="Select the parent Story/Task/Bug"
                allowClear={false}
              />
            </FormField>
          )}

          {isStandardIssue && (
            <FormField label="Epic" htmlFor="parent">
              <IssuePicker
                id="parent"
                projectId={projectId}
                issueTypes={['Epic']}
                value={parent ?? null}
                onChange={(v) => setValue('parent', v)}
                placeholder="Link to an Epic (optional)"
              />
            </FormField>
          )}
        </div>
      )}

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

      {isStandardIssue && (
        <FormField label="Story points" htmlFor="storyPoints" error={errors.storyPoints?.message}>
          <Input
            id="storyPoints"
            type="number"
            min={0}
            max={1000}
            value={storyPoints ?? ''}
            onChange={(e) =>
              setValue('storyPoints', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </FormField>
      )}

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
