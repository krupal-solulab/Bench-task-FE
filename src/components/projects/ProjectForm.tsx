import { zodResolver } from '@hookform/resolvers/zod'
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
import { projectSchema, type ProjectFormValues } from '@/schemas/project.schema'
import { toDateInputValue } from '@/lib/date'
import type { ProjectCategory } from '@/types/project-category.types'
import { Checkbox } from '@/components/ui/checkbox'
import type { Project } from '@/types/project.types'

export interface ProjectFormProps {
  initialValues?: Project
  onSubmit: (values: ProjectFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  /** Module 8 gap-closure - the org's category catalog; the picker is hidden when empty. */
  categories?: ProjectCategory[]
  /** Module 8 gap-closure - template projects offered on CREATE only (ignored when editing). */
  templates?: Pick<Project, 'id' | 'name'>[]
}

const NO_CATEGORY = '__none__'
const NO_TEMPLATE = '__none__'

export function ProjectForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  categories = [],
  templates = [],
}: ProjectFormProps) {
  const isCreate = !initialValues
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
      boardType: initialValues?.boardType ?? 'Scrum',
      categoryId: initialValues?.categoryId ?? null,
      isTemplate: initialValues?.isTemplate ?? false,
      // Left undefined (never null) so it's simply absent from the payload unless chosen - the
      // update endpoint rejects the key outright.
      templateProjectId: undefined,
    },
  })

  const startDate = watch('startDate')
  const dueDate = watch('dueDate')
  const boardType = watch('boardType')
  const categoryId = watch('categoryId')
  const isTemplate = watch('isTemplate')
  const templateProjectId = watch('templateProjectId')

  return (
    <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {isCreate && templates.length > 0 && (
        <FormField
          label="Start from template"
          htmlFor="templateProjectId"
          hint="Copies the template's workflow, issue types, fields, components, automations and schemes - not its tasks or members."
        >
          <Select
            value={templateProjectId ?? NO_TEMPLATE}
            onValueChange={(v) => setValue('templateProjectId', v === NO_TEMPLATE ? undefined : v)}
          >
            <SelectTrigger id="templateProjectId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE}>Blank project</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

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

      <FormField
        label="Board type"
        htmlFor="boardType"
        hint="Kanban hides the Backlog/Sprint-board/Calendar tabs - Board and List stay either way."
      >
        <Select
          value={boardType}
          onValueChange={(v) => setValue('boardType', v as ProjectFormValues['boardType'])}
        >
          <SelectTrigger id="boardType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Scrum">Scrum</SelectItem>
            <SelectItem value="Kanban">Kanban</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Module 8 gap-closure - hidden until an Admin has defined at least one category, so orgs
          that never use categories see the form exactly as before. */}
      {(categories.length > 0 || categoryId) && (
        <FormField label="Category" htmlFor="categoryId">
          <Select
            value={categoryId ?? NO_CATEGORY}
            onValueChange={(v) => setValue('categoryId', v === NO_CATEGORY ? null : v)}
          >
            <SelectTrigger id="categoryId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isTemplate ?? false}
          onCheckedChange={(c) => setValue('isTemplate', c === true)}
          aria-label="Offer as a template for new projects"
        />
        Offer as a template for new projects
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
