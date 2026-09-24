import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTaskLinks, useLinkTypes } from '@/hooks/queries/useIssueLinks'
import { useTaskSearch } from '@/hooks/queries/useTasks'
import { useCreateTaskLink, useDeleteTaskLink } from '@/hooks/mutations/useIssueLinkMutations'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'

export interface IssueLinksSectionProps {
  taskId: string
  canManage: boolean
}

interface PickedTask {
  id: string
  issueKey: string | null
  title: string
}

/** Module 1's "link this issue to another" section on the task detail page - a list of existing
 * links (resolved to the correct name/inverseName per direction, e.g. "Blocks" vs "Is Blocked
 * By") plus a quick-add row: pick a link type, search for the other issue org-wide (reusing the
 * JQL-lite `text ~` search - see useTaskSearch - so the picker isn't limited to the current
 * project), then link. Mirrors SubtaskChecklist's list + quick-add shape. */
export function IssueLinksSection({ taskId, canManage }: IssueLinksSectionProps) {
  const [linkTypeId, setLinkTypeId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [picked, setPicked] = useState<PickedTask | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: links, isLoading } = useTaskLinks(taskId)
  const { data: linkTypes } = useLinkTypes()
  const createLink = useCreateTaskLink(taskId)
  const deleteLink = useDeleteTaskLink(taskId)
  const { showToast } = useToast()

  const activeLinkTypeId = linkTypeId || linkTypes?.[0]?.id || ''

  const searchQuery =
    !picked && debouncedSearch.trim().length >= 2
      ? { jql: `text ~ '${debouncedSearch.trim().replace(/'/g, '')}'`, page: 1, limit: 10 }
      : null
  const searchResult = useTaskSearch(searchQuery)
  const linkedTaskIds = new Set((links ?? []).map((l) => l.task.id))
  const searchOptions = (searchResult.data?.data ?? []).filter(
    (t) => t.id !== taskId && !linkedTaskIds.has(t.id),
  )

  async function handleLink() {
    if (!picked || !activeLinkTypeId) return
    try {
      await createLink.mutateAsync({ targetTaskId: picked.id, linkTypeId: activeLinkTypeId })
      setPicked(null)
      setSearchTerm('')
    } catch (err) {
      showToast({
        title: 'Could not add link',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleRemove(linkId: string) {
    try {
      await deleteLink.mutateAsync(linkId)
    } catch (err) {
      showToast({
        title: 'Could not remove link',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return null

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <h3 className="mb-3 text-sm font-medium">Linked issues</h3>

      {(links ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked issues yet.</p>
      ) : (
        <ul className="space-y-2">
          {(links ?? []).map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {link.linkTypeName}
                </span>
                <Link to={`/tasks/${link.task.id}`} className="truncate hover:text-primary">
                  {link.task.issueKey && (
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {link.task.issueKey}
                    </span>
                  )}
                  {link.task.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {link.task.project.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge
                  status={link.task.status}
                  kind="task"
                  category={link.task.statusCategory}
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(link.id)}
                    aria-label={`Remove link to ${link.task.issueKey ?? link.task.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex gap-2">
            <Select value={activeLinkTypeId} onValueChange={setLinkTypeId}>
              <SelectTrigger aria-label="Link type" className="w-44 shrink-0">
                <SelectValue placeholder="Link type" />
              </SelectTrigger>
              <SelectContent>
                {(linkTypes ?? []).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {picked ? (
              <div className="flex flex-1 items-center justify-between gap-2 rounded-md border border-input px-3 text-sm">
                <span className="truncate">
                  {picked.issueKey && (
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {picked.issueKey}
                    </span>
                  )}
                  {picked.title}
                </span>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  aria-label="Clear selected issue"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search issues to link…"
                className="flex-1"
              />
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleLink()}
              loading={createLink.isPending}
              disabled={!picked || !activeLinkTypeId}
            >
              Link
            </Button>
          </div>

          {!picked && searchQuery && (
            <div className="rounded-md border">
              {searchResult.isLoading ? (
                <p className="p-2 text-xs text-muted-foreground">Searching…</p>
              ) : searchOptions.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">No matching issues found.</p>
              ) : (
                <ul>
                  {searchOptions.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked({ id: task.id, issueKey: task.issueKey, title: task.title })
                          setSearchTerm('')
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        {task.issueKey && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {task.issueKey}
                          </span>
                        )}
                        <span className="truncate">{task.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {task.project.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
