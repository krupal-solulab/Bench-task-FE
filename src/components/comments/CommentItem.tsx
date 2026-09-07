import { useState } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateComment, useDeleteComment } from '@/hooks/mutations/useCommentMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { formatRelativeTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { Comment } from '@/types/comment.types'

export function CommentItem({ comment, taskId }: { comment: Comment; taskId: string }) {
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateComment = useUpdateComment(taskId, comment.id)
  const deleteComment = useDeleteComment(taskId)

  const isOwn = user?.id === comment.author.id
  const canModify = isOwn || hasRole('Admin')
  const isOptimistic = comment.id.startsWith('temp-')

  async function handleSave() {
    try {
      await updateComment.mutateAsync({ body: draft })
      setEditing(false)
    } catch (err) {
      showToast({
        title: 'Could not update comment',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteComment.mutateAsync(comment.id)
    } catch (err) {
      showToast({
        title: 'Could not delete comment',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className={cn('flex gap-3 transition-opacity', isOptimistic && 'opacity-60')}>
      <Avatar name={comment.author.name} size="sm" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.author.name}</span>
          <span>{formatRelativeTime(comment.createdAt)}</span>
          {isOptimistic && <span>Sending…</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} loading={updateComment.isPending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-lg rounded-tl-none bg-muted/60 px-3 py-2 text-sm">{comment.body}</p>
        )}

        {canModify && !editing && !isOptimistic && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="hover:text-foreground"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="hover:text-destructive"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete comment"
        description="This cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
