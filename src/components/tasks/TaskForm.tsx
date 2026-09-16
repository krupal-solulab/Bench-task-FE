import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { UserSelect } from '@/components/common/UserSelect'
import { TagInput } from '@/components/common/TagInput'
import { IssuePicker } from '@/components/tasks/IssuePicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProject, useProjectLabels } from '@/hooks/queries/useProjects'
import { taskSchema, type TaskFormValues } from '@/schemas/task.schema'
import { TASK_PRIORITIES, type Task } from '@/types/task.types'
import { resolveIssueTypes } from '@/types/issue-type.types'

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
      labels: initialValues?.labels ?? [],
      components: initialValues?.components ?? [],
      customFieldValues: initialValues?.customFieldValues ?? {},
    },
  })

  const { data: project } = useProject(projectId)
  const { data: labelSuggestions } = useProjectLabels(projectId)

  const dueDate = watch('dueDate')
  const assignee = watch('assignee')
  const priority = watch('priority')
  const issueType = watch('issueType') ?? 'Task'
  const parent = watch('parent')
  const storyPoints = watch('storyPoints')
  const labels = watch('labels') ?? []
  const components = watch('components') ?? []
  const customFieldValues = watch('customFieldValues') ?? {}

  // Hierarchy position is fixed at creation - the API doesn't accept issueType/parent changes on
  // an existing issue, so editing shows it read-only instead of a control nothing would apply.
  const isEditingExisting = !!initialValues
  const issueTypeDefinitions = resolveIssueTypes(project ?? {})
  const standardTypeNames = issueTypeDefinitions
    .filter((t) => t.level === 'standard')
    .map((t) => t.name)
  const epicTypeNames = issueTypeDefinitions.filter((t) => t.level === 'epic').map((t) => t.name)
  const isStandardIssue = standardTypeNames.includes(issueType)

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
                {issueTypeDefinitions.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
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
                issueTypes={standardTypeNames}
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
                issueTypes={epicTypeNames}
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

      <FormField label="Labels" htmlFor="labels">
        <TagInput
          id="labels"
          value={labels}
          onChange={(next) => setValue('labels', next)}
          suggestions={labelSuggestions}
          placeholder="Type a label and press Enter"
        />
      </FormField>

      {(project?.components.length ?? 0) > 0 && (
        <FormField label="Components" htmlFor="components">
          <TagInput
            id="components"
            value={components}
            onChange={(next) => setValue('components', next)}
            suggestions={project?.components ?? []}
            placeholder="Pick a component"
          />
        </FormField>
      )}

      {project?.customFields.map((field) => (
        <FormField
          key={field.id}
          label={field.name}
          htmlFor={`custom-field-${field.id}`}
          required={field.required}
        >
          {field.type === 'Text' && (
            <Input
              id={`custom-field-${field.id}`}
              value={(customFieldValues[field.id] as string | undefined) ?? ''}
              onChange={(e) =>
                setValue('customFieldValues', { ...customFieldValues, [field.id]: e.target.value })
              }
            />
          )}
          {field.type === 'Number' && (
            <Input
              id={`custom-field-${field.id}`}
              type="number"
              value={(customFieldValues[field.id] as number | undefined) ?? ''}
              onChange={(e) =>
                setValue('customFieldValues', {
                  ...customFieldValues,
                  [field.id]: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          )}
          {field.type === 'Date' && (
            <DatePicker
              id={`custom-field-${field.id}`}
              value={(customFieldValues[field.id] as string | null | undefined) ?? null}
              onChange={(v) =>
                setValue('customFieldValues', { ...customFieldValues, [field.id]: v })
              }
            />
          )}
          {field.type === 'Dropdown' && (
            <Select
              value={(customFieldValues[field.id] as string | undefined) ?? ''}
              onValueChange={(v) =>
                setValue('customFieldValues', { ...customFieldValues, [field.id]: v })
              }
            >
              <SelectTrigger id={`custom-field-${field.id}`}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.type === 'Checkbox' && (
            <Checkbox
              id={`custom-field-${field.id}`}
              checked={(customFieldValues[field.id] as boolean | undefined) ?? false}
              onCheckedChange={(checked) =>
                setValue('customFieldValues', {
                  ...customFieldValues,
                  [field.id]: checked === true,
                })
              }
            />
          )}
        </FormField>
      ))}

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
