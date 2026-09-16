import { useState } from 'react'
import { Pencil, Plus, Trash2, Workflow as WorkflowIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { WorkflowTemplateForm } from '@/components/admin/WorkflowTemplateForm'
import { useWorkflowTemplates } from '@/hooks/queries/useWorkflowTemplates'
import {
  useCreateWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useUpdateWorkflowTemplate,
} from '@/hooks/mutations/useWorkflowTemplateMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { WorkflowTemplatePayload } from '@/services/workflowTemplates.service'
import type { WorkflowTemplate } from '@/types/workflow-template.types'

/** The Platform-Admin-maintained workflow template library (BRD Section 5) - every org's Admins
 * can browse and apply these from a project's Workflow tab; only a Platform Admin can add, edit,
 * or delete one here. Mirrors PermissionSchemesPage's create/edit/delete-via-modal shape. */
export function PlatformWorkflowTemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null)
  const [deleting, setDeleting] = useState<WorkflowTemplate | null>(null)

  const { data: templates, isLoading } = useWorkflowTemplates()
  const createTemplate = useCreateWorkflowTemplate()
  const updateTemplate = useUpdateWorkflowTemplate(editing?.id ?? '')
  const deleteTemplate = useDeleteWorkflowTemplate()
  const { showToast } = useToast()

  async function handleCreate(values: WorkflowTemplatePayload) {
    try {
      await createTemplate.mutateAsync(values)
      showToast({ title: 'Workflow template created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create workflow template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: WorkflowTemplatePayload) {
    try {
      await updateTemplate.mutateAsync(values)
      showToast({ title: 'Workflow template updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update workflow template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteTemplate.mutateAsync(deleting.id)
      showToast({ title: 'Workflow template deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete workflow template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow templates"
        description="Starter workflows every organization's Admins can apply to a project - create, edit, or remove them here"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />

      {!isLoading && (templates ?? []).length === 0 && (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflow templates yet"
          description="Create a starter workflow that any organization's Admin can apply to a project."
          actionLabel="New template"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(templates ?? []).map((template) => (
          <div key={template.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{template.name}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(template)}
                  aria-label={`Edit ${template.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(template)}
                  aria-label={`Delete ${template.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground">{template.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {template.workflow.statuses.length} statuses, {template.workflow.transitions.length}{' '}
              transitions
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New workflow template" size="lg">
        <WorkflowTemplateForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create template"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
        size="lg"
      >
        {editing && (
          <WorkflowTemplateForm
            initialValues={{
              name: editing.name,
              description: editing.description,
              workflow: editing.workflow,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete workflow template"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone. Projects that already applied it keep their own saved workflow.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
