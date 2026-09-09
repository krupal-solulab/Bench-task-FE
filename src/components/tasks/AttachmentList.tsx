import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Paperclip, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/Skeleton'
import { useTaskAttachments } from '@/hooks/queries/useTaskAttachments'
import { useUploadAttachment, useDeleteAttachment } from '@/hooks/mutations/useAttachmentMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { formatRelativeTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { attachmentsService } from '@/services/attachments.service'
import type { Attachment } from '@/types/attachment.types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentRow({ attachment, taskId }: { attachment: Attachment; taskId: string }) {
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const deleteAttachment = useDeleteAttachment(taskId)

  const isOwn = user?.id === attachment.uploadedBy.id
  const canDelete = isOwn || hasRole('Admin') || hasRole('Manager')

  async function handleDownload() {
    try {
      const { url } = await attachmentsService.getDownloadUrl(attachment.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showToast({
        title: 'Could not get download link',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteAttachment.mutateAsync(attachment.id)
    } catch (err) {
      showToast({
        title: 'Could not delete attachment',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)} · {attachment.uploadedBy.name} ·{' '}
          {formatRelativeTime(attachment.createdAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleDownload()}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Download ${attachment.filename}`}
      >
        <Download className="h-4 w-4" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleteAttachment.isPending}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${attachment.filename}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function AttachmentList({ taskId }: { taskId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading, isError, error, refetch } = useTaskAttachments(taskId, {
    page: 1,
    limit: 50,
  })
  const uploadAttachment = useUploadAttachment(taskId)
  const { showToast } = useToast()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadAttachment.mutateAsync(file)
    } catch (err) {
      showToast({
        title: 'Could not upload file',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Attachments</h3>
        <Button
          size="sm"
          variant="outline"
          loading={uploadAttachment.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        )}

        {!isLoading && !isError && data?.data.length === 0 && (
          <EmptyState
            title="No attachments"
            description="Upload a file to attach it to this task."
          />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <AnimatePresence initial={false}>
            {data.data.map((attachment) => (
              <motion.div
                key={attachment.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <AttachmentRow attachment={attachment} taskId={taskId} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
