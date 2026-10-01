import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import {
  useAddExternalReference,
  useRemoveExternalReference,
} from '@/hooks/mutations/useTaskMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Task } from '@/types/task.types'

/** Module 7 gap-closure: manually-pasted external links (e.g. a GitHub/GitLab PR/commit URL) -
 * deliberately not a real connector, see the backend's ExternalReference doc comment. Any project
 * member can add one (same gate as watch/vote); only the person who added it, or a same-org
 * Admin, can remove it (same split CommentItem uses for edit/delete). */
export function ExternalReferencesSection({ task }: { task: Task }) {
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const addReference = useAddExternalReference(task.id)
  const removeReference = useRemoveExternalReference(task.id)

  async function handleAdd() {
    if (!label.trim() || !url.trim()) return
    try {
      await addReference.mutateAsync({ label: label.trim(), url: url.trim() })
      setLabel('')
      setUrl('')
    } catch (err) {
      showToast({
        title: 'Could not add external reference',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleRemove(referenceId: string) {
    try {
      await removeReference.mutateAsync(referenceId)
    } catch (err) {
      showToast({
        title: 'Could not remove external reference',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <h3 className="mb-3 text-sm font-medium">External references</h3>

      {task.externalReferences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No external references yet - paste a link to a PR, commit, or branch below.
        </p>
      ) : (
        <ul className="space-y-2">
          {task.externalReferences.map((reference) => {
            const canRemove = reference.addedBy.id === user?.id || hasRole('Admin')
            return (
              <li key={reference.id} className="flex items-center justify-between gap-3 text-sm">
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-1.5 truncate text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{reference.label}</span>
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{reference.addedBy.name}</span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(reference.id)}
                      aria-label={`Remove reference ${reference.label}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex gap-2 border-t pt-4">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. PR #42"
          aria-label="Reference label"
          className="w-40 shrink-0"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/…"
          aria-label="Reference URL"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleAdd()}
          loading={addReference.isPending}
          disabled={!label.trim() || !url.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
