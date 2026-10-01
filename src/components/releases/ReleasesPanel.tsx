import { useMemo, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { ReleaseForm } from './ReleaseForm'
import { ReleaseLifecycleControls } from './ReleaseLifecycleControls'
import { ReleaseNotesModal } from './ReleaseNotesModal'
import { ReleaseCompareModal } from './ReleaseCompareModal'
import { ReleaseCalendarView } from './ReleaseCalendarView'
import { useReleases, useReleaseProgress } from '@/hooks/queries/useReleases'
import { ReleaseEtaText } from '@/components/releases/ReleaseEtaText'
import { useCreateRelease, useUpdateRelease } from '@/hooks/mutations/useReleaseMutations'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatRelativeTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ReleaseFormValues } from '@/schemas/release.schema'
import type { Release } from '@/types/release.types'

interface ReleaseRowProps {
  release: Release
  projectId: string
  canManage: boolean
  ownerName: string | null
  onEdit: () => void
  onViewNotes: () => void
}

/** Its own component so it can own its own useReleaseProgress query instance, mirroring
 * RoadmapPage's EpicRow / TaskDetailPage's per-item hook-ownership pattern. */
function ReleaseRow({
  release,
  projectId,
  canManage,
  ownerName,
  onEdit,
  onViewNotes,
}: ReleaseRowProps) {
  const { data: progress } = useReleaseProgress(projectId, release.id)
  const unreleasedIssues = progress?.unreleasedIssues ?? []
  // The shipping countdown is purely a client-side read of the already-fetched target date - once
  // the release has actually shipped (releasedAt set), a countdown to it no longer means anything.
  const showCountdown = !release.releasedAt && !!release.releaseDate

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{release.name}</p>
          {release.description && (
            <p className="text-sm text-muted-foreground">{release.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {release.releasedAt
              ? `Released ${formatDate(release.releasedAt)}`
              : release.releaseDate
                ? `Target: ${formatDate(release.releaseDate)}`
                : 'No target date set'}
            {showCountdown && ` (${formatRelativeTime(release.releaseDate!)})`}
          </p>
          {ownerName && <p className="text-xs text-muted-foreground">Owner: {ownerName}</p>}
        </div>
        <ReleaseLifecycleControls
          release={release}
          projectId={projectId}
          canManage={canManage}
          onEdit={onEdit}
        />
      </div>

      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-smooth"
            style={{ width: `${progress?.progress ?? 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {progress ? `${progress.doneIssues}/${progress.totalIssues} issues done` : '—'}
          </p>
          <button
            type="button"
            onClick={onViewNotes}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5" /> Release notes
          </button>
        </div>
      </div>

      {!release.releasedAt && <ReleaseEtaText eta={progress?.eta} />}

      {unreleasedIssues.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {unreleasedIssues.length} issue(s) not yet done
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4">
            {unreleasedIssues.map((issue) => (
              <li key={issue.id}>
                {issue.issueKey && <span className="font-mono">{issue.issueKey} </span>}
                {issue.title} · {issue.status}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export interface ReleasesPanelProps {
  projectId: string
  canManage: boolean
}

/** Module 2's Releases tab (BRD: "Fix Version"/"Affects Version" tracking, release progress
 * bars, auto-drafted release notes) - mirrors the Sprints tab's list-of-cards + lifecycle-
 * controls-per-card shape. */
export function ReleasesPanel({ projectId, canManage }: ReleasesPanelProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Release | null>(null)
  const [notesFor, setNotesFor] = useState<Release | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const { data, isLoading } = useReleases(projectId, { page: 1, limit: 100, sortOrder: 'asc' })
  const { data: users } = useAssignableUsers()
  const createRelease = useCreateRelease(projectId)
  const updateRelease = useUpdateRelease(projectId, editing?.id ?? '')
  const { showToast } = useToast()

  const ownerNameById = useMemo(
    () => new Map((users?.data ?? []).map((u) => [u.id, u.name])),
    [users],
  )

  async function handleCreate(values: ReleaseFormValues) {
    try {
      await createRelease.mutateAsync(values)
      showToast({ title: 'Release created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create release',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: ReleaseFormValues) {
    try {
      await updateRelease.mutateAsync(values)
      showToast({ title: 'Release updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update release',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return <CardSkeleton />

  const releases = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Fix Version / Affects Version tracking for this project's issues
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              type="button"
              size="sm"
              variant={view === 'list' ? 'default' : 'ghost'}
              onClick={() => setView('list')}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setView('calendar')}
            >
              Calendar
            </Button>
          </div>
          {releases.length >= 2 && (
            <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
              Compare releases
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> New release
            </Button>
          )}
        </div>
      </div>

      {releases.length === 0 ? (
        <EmptyState
          title="No releases yet"
          description="Create a release to start tagging issues with a Fix Version."
          actionLabel={canManage ? 'New release' : undefined}
          onAction={canManage ? () => setCreateOpen(true) : undefined}
        />
      ) : view === 'calendar' ? (
        <ReleaseCalendarView releases={releases} />
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <ReleaseRow
              key={release.id}
              release={release}
              projectId={projectId}
              canManage={canManage}
              ownerName={release.ownerId ? (ownerNameById.get(release.ownerId) ?? null) : null}
              onEdit={() => setEditing(release)}
              onViewNotes={() => setNotesFor(release)}
            />
          ))}
        </div>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New release">
        <ReleaseForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create release"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
      >
        {editing && (
          <ReleaseForm
            initialValues={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ReleaseNotesModal
        projectId={projectId}
        release={notesFor}
        onClose={() => setNotesFor(null)}
      />

      <ReleaseCompareModal
        projectId={projectId}
        releases={releases}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  )
}
