import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { DatePicker } from '@/components/common/DatePicker'
import { UserSelect } from '@/components/common/UserSelect'
import { TagInput } from '@/components/common/TagInput'
import { IssuePicker } from '@/components/tasks/IssuePicker'
import { ReleaseMultiSelect } from '@/components/releases/ReleaseMultiSelect'
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
import {
  useEffectiveCustomFields,
  useProject,
  useProjectLabels,
  useSuggestedTaskFields,
} from '@/hooks/queries/useProjects'
import { useSecuritySchemes } from '@/hooks/queries/useSecuritySchemes'
import { useTaskSearch } from '@/hooks/queries/useTasks'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { useDebounce } from '@/hooks/useDebounce'
import { taskSchema, type TaskFormValues } from '@/schemas/task.schema'
import { TASK_PRIORITIES, type Task } from '@/types/task.types'
import { resolveIssueTypes } from '@/types/issue-type.types'

const NO_SECURITY_LEVEL = '__none__'

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
      originalEstimateHours: initialValues?.originalEstimateHours ?? null,
      labels: initialValues?.labels ?? [],
      components: initialValues?.components ?? [],
      fixVersions: initialValues?.fixVersions?.map((r) => r.id) ?? [],
      affectsVersions: initialValues?.affectsVersions?.map((r) => r.id) ?? [],
      customFieldValues: initialValues?.customFieldValues ?? {},
      securityLevel: initialValues?.securityLevel ?? null,
    },
  })

  const { data: project } = useProject(projectId)
  const { data: labelSuggestions } = useProjectLabels(projectId)
  const { data: securitySchemes } = useSecuritySchemes()
  const assignedSecurityScheme = securitySchemes?.find((s) => s.id === project?.securitySchemeId)

  const title = watch('title')
  const dueDate = watch('dueDate')
  const assignee = watch('assignee')
  const priority = watch('priority')
  const issueType = watch('issueType') ?? 'Task'
  const parent = watch('parent')
  const storyPoints = watch('storyPoints')
  const originalEstimateHours = watch('originalEstimateHours')
  const labels = watch('labels') ?? []
  const components = watch('components') ?? []
  const fixVersions = watch('fixVersions') ?? []
  const affectsVersions = watch('affectsVersions') ?? []
  const customFieldValues = watch('customFieldValues') ?? {}
  const securityLevel = watch('securityLevel')

  // Hierarchy position is fixed at creation - the API doesn't accept issueType/parent changes on
  // an existing issue, so editing shows it read-only instead of a control nothing would apply.
  const isEditingExisting = !!initialValues
  const issueTypeDefinitions = resolveIssueTypes(project ?? {})
  const standardTypeNames = issueTypeDefinitions
    .filter((t) => t.level === 'standard')
    .map((t) => t.name)
  const epicTypeNames = issueTypeDefinitions.filter((t) => t.level === 'epic').map((t) => t.name)
  const isStandardIssue = standardTypeNames.includes(issueType)

  // Applies any per-issue-type hidden/required override (Custom Fields v2) once the issue type
  // is known; falls back to the project-wide list while that request is still loading, so fields
  // never flash away.
  const { data: effectiveCustomFields } = useEffectiveCustomFields(projectId, issueType)
  const customFields = effectiveCustomFields ?? project?.customFields ?? []

  // Module 10's deterministic (non-LLM) duplicate-detection: the same JQL `text ~` search
  // IssueLinksSection already uses, scoped to this project, fired once the title looks like a
  // real search term - create-mode only, since an existing issue isn't a duplicate of itself.
  const debouncedTitle = useDebounce(title, 400)
  const duplicateSearchQuery =
    !isEditingExisting && debouncedTitle.trim().length >= 4
      ? {
          jql: `text ~ '${debouncedTitle.trim().replace(/'/g, '')}' AND project = "${projectId}"`,
          page: 1,
          limit: 5,
        }
      : null
  const { data: duplicateResults, isLoading: isSearchingDuplicates } =
    useTaskSearch(duplicateSearchQuery)
  const possibleDuplicates = (duplicateResults?.data ?? []).filter(
    (t) => t.id !== initialValues?.id,
  )

  // Module 10's deterministic (non-LLM) field suggestion: the most-frequent assignee/labels for
  // this project's existing issues of the chosen type - create-mode only, and only once an
  // issueType is picked (the suggestion is scoped to it).
  const { data: suggestedFields } = useSuggestedTaskFields(
    !isEditingExisting ? projectId : undefined,
    issueType,
  )
  const { data: assignableUsers } = useAssignableUsers()
  const suggestedAssigneeId = suggestedFields?.suggestedAssigneeId ?? null
  const suggestedAssigneeName = assignableUsers?.data.find(
    (u) => u.id === suggestedAssigneeId,
  )?.name
  const suggestedLabels = suggestedFields?.suggestedLabels ?? []
  const hasUnappliedAssigneeSuggestion =
    !isEditingExisting && !!suggestedAssigneeId && assignee !== suggestedAssigneeId
  const unappliedSuggestedLabels = suggestedLabels.filter((l) => !labels.includes(l))
  const hasFieldSuggestions =
    !isEditingExisting && (hasUnappliedAssigneeSuggestion || unappliedSuggestedLabels.length > 0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Title" htmlFor="title" error={errors.title?.message} required>
        <Input id="title" {...register('title')} />
      </FormField>

      {duplicateSearchQuery && (isSearchingDuplicates || possibleDuplicates.length > 0) && (
        <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs">
          <p className="mb-1 font-medium text-muted-foreground">
            {isSearchingDuplicates ? 'Checking for similar issues…' : 'Possibly similar issues:'}
          </p>
          {!isSearchingDuplicates && (
            <ul className="space-y-1">
              {possibleDuplicates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-muted-foreground">
                  {t.issueKey && <span className="font-mono">{t.issueKey}</span>}
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
        <div className="grid grid-cols-2 gap-4">
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

          <FormField
            label="Original estimate (hours)"
            htmlFor="originalEstimateHours"
            error={errors.originalEstimateHours?.message}
          >
            <Input
              id="originalEstimateHours"
              type="number"
              min={0}
              max={10000}
              step={0.5}
              value={originalEstimateHours ?? ''}
              onChange={(e) =>
                setValue(
                  'originalEstimateHours',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
            />
          </FormField>
        </div>
      )}

      {hasFieldSuggestions && (
        <div className="space-y-1.5 rounded-md border border-dashed bg-muted/30 p-2 text-xs">
          <p className="font-medium text-muted-foreground">
            Suggested, based on this project's existing issues:
          </p>
          {hasUnappliedAssigneeSuggestion && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Assign to {suggestedAssigneeName ?? 'a common assignee'}
              </span>
              <button
                type="button"
                onClick={() => setValue('assignee', suggestedAssigneeId)}
                className="font-medium text-primary hover:underline"
              >
                Apply
              </button>
            </div>
          )}
          {unappliedSuggestedLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">
                Common labels: {unappliedSuggestedLabels.join(', ')}
              </span>
              <button
                type="button"
                onClick={() => setValue('labels', [...labels, ...unappliedSuggestedLabels])}
                className="font-medium text-primary hover:underline"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      <FormField label="Assignee" htmlFor="assignee" error={errors.assignee?.message}>
        <UserSelect
          id="assignee"
          value={assignee ?? null}
          onChange={(v) => setValue('assignee', v)}
          memberIds={memberIds}
        />
      </FormField>

      {assignedSecurityScheme && (
        <FormField label="Security level" htmlFor="securityLevel">
          <Select
            value={securityLevel ?? NO_SECURITY_LEVEL}
            onValueChange={(v) => setValue('securityLevel', v === NO_SECURITY_LEVEL ? null : v)}
          >
            <SelectTrigger id="securityLevel">
              <SelectValue placeholder="None (no restriction)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SECURITY_LEVEL}>None (no restriction)</SelectItem>
              {assignedSecurityScheme.levels.map((level) => (
                <SelectItem key={level.name} value={level.name}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fix Version" htmlFor="fixVersions">
          <ReleaseMultiSelect
            id="fixVersions"
            projectId={projectId}
            value={fixVersions}
            onChange={(next) => setValue('fixVersions', next)}
            placeholder="No fix version"
          />
        </FormField>

        <FormField label="Affects Version" htmlFor="affectsVersions">
          <ReleaseMultiSelect
            id="affectsVersions"
            projectId={projectId}
            value={affectsVersions}
            onChange={(next) => setValue('affectsVersions', next)}
            placeholder="No affects version"
          />
        </FormField>
      </div>

      {customFields.map((field) => (
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
          {field.type === 'MultiSelect' && (
            <TagInput
              id={`custom-field-${field.id}`}
              value={(customFieldValues[field.id] as string[] | undefined) ?? []}
              onChange={(next) =>
                setValue('customFieldValues', { ...customFieldValues, [field.id]: next })
              }
              suggestions={field.options ?? []}
              placeholder="Pick an option"
            />
          )}
          {field.type === 'UserPicker' && (
            <UserSelect
              id={`custom-field-${field.id}`}
              value={(customFieldValues[field.id] as string | null | undefined) ?? null}
              onChange={(v) =>
                setValue('customFieldValues', { ...customFieldValues, [field.id]: v })
              }
              memberIds={memberIds}
              placeholder={`Select ${field.name.toLowerCase()}`}
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
