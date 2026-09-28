import { useState } from 'react'
import { FileStack, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { IssueTemplateForm } from '@/components/admin/IssueTemplateForm'
import { useIssueTemplates } from '@/hooks/queries/useIssueTemplates'
import { useProjects } from '@/hooks/queries/useProjects'
import {
  useCreateIssueTemplate,
  useDeleteIssueTemplate,
  useUpdateIssueTemplate,
} from '@/hooks/mutations/useIssueTemplateMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { CreateIssueTemplatePayload, IssueTemplate } from '@/types/issue-template.types'

export function IssueTemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<IssueTemplate | null>(null)
  const [deleting, setDeleting] = useState<IssueTemplate | null>(null)

  const { data: templates, isLoading } = useIssueTemplates()
  const { data: projects } = useProjects({ page: 1, limit: 100 })
  const createTemplate = useCreateIssueTemplate()
  const updateTemplate = useUpdateIssueTemplate(editing?.id ?? '')
  const deleteTemplate = useDeleteIssueTemplate()
  const { showToast } = useToast()

  const projectNameById = new Map((projects?.data ?? []).map((p) => [p.id, p.name]))

  async function handleCreate(values: CreateIssueTemplatePayload) {
    try {
      await createTemplate.mutateAsync(values)
      showToast({ title: 'Issue template created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create issue template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateIssueTemplatePayload) {
    try {
      await updateTemplate.mutateAsync(values)
      showToast({ title: 'Issue template updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update issue template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteTemplate.mutateAsync(deleting.id)
      showToast({ title: 'Issue template deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete issue template',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue templates"
        description="Reusable default field values that pre-fill the New Task form"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />

      {!isLoading && (templates ?? []).length === 0 && (
        <EmptyState
          icon={FileStack}
          title="No issue templates yet"
          description="Create a template so staff can quickly file a well-structured issue (e.g. a bug report format)."
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
            <p className="text-xs text-muted-foreground">
              {template.issueType} &middot;{' '}
              {template.projectId
                ? (projectNameById.get(template.projectId) ?? 'One project')
                : 'Org-wide'}
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New issue template" size="lg">
        <IssueTemplateForm
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
          <IssueTemplateForm
            initialValues={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete issue template"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
