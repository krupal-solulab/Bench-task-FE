import { useRef, useState } from 'react'
import Markdown, { type Components } from 'react-markdown'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateComment, useDeleteComment } from '@/hooks/mutations/useCommentMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { formatRelativeTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { parseCommentBody } from '@/lib/mentions'
import { applyMarkdownFormat, type MarkdownFormatKind } from '@/lib/markdown-format'
import { FormattingToolbar } from '@/components/comments/FormattingToolbar'
import type { Comment } from '@/types/comment.types'

/** Module 7 gap-closure: a text segment's markdown is rendered inline - `p` flattens to a
 * Fragment so a multi-block body doesn't force paragraph spacing inside the single-line comment
 * bubble, and `img` degrades to a plain link rather than silently loading external images (a
 * pasted image URL would otherwise leak the viewer's IP to that URL on render). */
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <a
      href={typeof src === 'string' ? src : undefined}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline"
    >
      {alt || src}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{children}</code>
  ),
}

/** Renders `@[Name](userId)` markup as a highlighted mention chip, and every other segment as
 * markdown (bold/italic/link/code - see FormattingToolbar) - split first so a mention's own
 * `[Name](userId)` shape never collides with real markdown link syntax. */
function CommentBody({ body }: { body: string }) {
  return (
    <>
      {parseCommentBody(body).map((segment, index) =>
        segment.type === 'mention' ? (
          <span key={index} className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary">
            @{segment.name}
          </span>
        ) : (
          <Markdown key={index} components={MARKDOWN_COMPONENTS}>
            {segment.value}
          </Markdown>
        ),
      )}
    </>
  )
}

export function CommentItem({ comment, taskId }: { comment: Comment; taskId: string }) {
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)

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

  function handleFormat(kind: MarkdownFormatKind) {
    const textarea = editTextareaRef.current
    const selectionStart = textarea?.selectionStart ?? draft.length
    const selectionEnd = textarea?.selectionEnd ?? draft.length
    const result = applyMarkdownFormat(draft, selectionStart, selectionEnd, kind)
    setDraft(result.text)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return (
    <div className={cn('flex gap-3 transition-opacity', isOptimistic && 'opacity-60')}>
      <Avatar name={comment.author.name} size="sm" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.author.name}</span>
          <span>{formatRelativeTime(comment.createdAt)}</span>
          {comment.editHistory.length > 0 && (
            <Popover>
              <PopoverTrigger className="underline decoration-dotted hover:text-foreground">
                (edited)
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <p className="mb-2 text-xs font-medium text-foreground">Edit history</p>
                <ul className="space-y-2">
                  {comment.editHistory.map((entry, index) => (
                    <li key={index} className="text-xs">
                      <p className="text-muted-foreground">{formatRelativeTime(entry.editedAt)}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{entry.body}</p>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )}
          {isOptimistic && <span>Sending…</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <FormattingToolbar onFormat={handleFormat} />
            <Textarea
              ref={editTextareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
            />
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
          <p className="rounded-lg rounded-tl-none bg-muted/60 px-3 py-2 text-sm">
            <CommentBody body={comment.body} />
          </p>
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
