import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useProjectCategories } from '@/hooks/queries/useProjectCategories'
import {
  useCreateProjectCategory,
  useDeleteProjectCategory,
  useUpdateProjectCategory,
} from '@/hooks/mutations/useProjectCategoryMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { ProjectCategory, ProjectCategoryPayload } from '@/types/project-category.types'

interface CategoryFormProps {
  initialValues?: ProjectCategoryPayload
  onSubmit: (values: ProjectCategoryPayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

function CategoryForm({ initialValues, onSubmit, onCancel, submitLabel }: CategoryFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const trimmed = name.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onSubmit({ name: trimmed, description })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="category-name" required>
        <Input
          id="category-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField label="Description" htmlFor="category-description">
        <Textarea
          id="category-description"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!trimmed}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** Module 8 gap-closure - the org-wide project category catalog (Admin-only). */
export function ProjectCategoriesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectCategory | null>(null)
  const [deleting, setDeleting] = useState<ProjectCategory | null>(null)

  const { data: categories, isLoading } = useProjectCategories()
  const createCategory = useCreateProjectCategory()
  const updateCategory = useUpdateProjectCategory(editing?.id ?? '')
  const deleteCategory = useDeleteProjectCategory()
  const { showToast } = useToast()

  async function handleCreate(values: ProjectCategoryPayload) {
    try {
      await createCategory.mutateAsync(values)
      showToast({ title: 'Category created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create category',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: ProjectCategoryPayload) {
    try {
      await updateCategory.mutateAsync(values)
      showToast({ title: 'Category updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update category',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteCategory.mutateAsync(deleting.id)
      showToast({ title: 'Category deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete category',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project categories"
        description="Group projects (e.g. Client Work, Internal) - pick one on any project and filter the Projects list by it"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {!isLoading && (categories ?? []).length === 0 && (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create a category, then assign it from a project's Edit form."
          actionLabel="New category"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(categories ?? []).map((category) => (
          <div key={category.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{category.name}</p>
                {category.description && (
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  aria-label={`Edit ${category.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(category)}
                  aria-label={`Delete ${category.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New category">
        <CategoryForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create category"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
      >
        {editing && (
          <CategoryForm
            initialValues={{ name: editing.name, description: editing.description }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete category"
        description={`Delete "${deleting?.name ?? ''}"? A category still used by a project can't be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
