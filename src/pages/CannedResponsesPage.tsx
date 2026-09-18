import { useState } from 'react'
import { MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { CannedResponseForm } from '@/components/canned-responses/CannedResponseForm'
import { useCannedResponses } from '@/hooks/queries/useCannedResponses'
import {
  useCreateCannedResponse,
  useDeleteCannedResponse,
  useUpdateCannedResponse,
} from '@/hooks/mutations/useCannedResponseMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { CannedResponse, CreateCannedResponsePayload } from '@/types/canned-response.types'

export function CannedResponsesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CannedResponse | null>(null)
  const [deleting, setDeleting] = useState<CannedResponse | null>(null)

  const { data: responses, isLoading } = useCannedResponses()
  const createResponse = useCreateCannedResponse()
  const updateResponse = useUpdateCannedResponse(editing?.id ?? '')
  const deleteResponse = useDeleteCannedResponse()
  const { showToast } = useToast()

  async function handleCreate(values: CreateCannedResponsePayload) {
    try {
      await createResponse.mutateAsync(values)
      showToast({ title: 'Canned response created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create canned response',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateCannedResponsePayload) {
    try {
      await updateResponse.mutateAsync(values)
      showToast({ title: 'Canned response updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update canned response',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteResponse.mutateAsync(deleting.id)
      showToast({ title: 'Canned response deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete canned response',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canned responses"
        description="Shared reply snippets - visible and editable by everyone in your organization"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New response
          </Button>
        }
      />

      {!isLoading && (responses ?? []).length === 0 && (
        <EmptyState
          icon={MessageSquareText}
          title="No canned responses yet"
          description="Create a reusable reply snippet your whole team can insert into comments."
          actionLabel="New response"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(responses ?? []).map((response) => (
          <div key={response.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{response.title}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(response)}
                  aria-label={`Edit ${response.title}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(response)}
                  aria-label={`Delete ${response.title}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="line-clamp-3 text-xs text-muted-foreground">{response.body}</p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New canned response">
        <CannedResponseForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create response"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.title ?? ''}"`}
      >
        {editing && (
          <CannedResponseForm
            initialValues={{ title: editing.title, body: editing.body }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete canned response"
        description={`Delete "${deleting?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
