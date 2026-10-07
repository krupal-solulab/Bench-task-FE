import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { FormField } from '@/components/common/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReleaseCompare } from '@/hooks/queries/useReleases'
import { formatDate } from '@/lib/date'
import type { Release, ReleaseCompareIssue, ReleaseMovedOutIssue } from '@/types/release.types'

export interface ReleaseCompareModalProps {
  projectId: string
  releases: Release[]
  open: boolean
  onClose: () => void
}

function IssueColumn({ title, issues }: { title: string; issues: ReleaseCompareIssue[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({issues.length})
      </h4>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue.id} className="text-sm">
              {issue.issueKey && (
                <span className="font-mono text-xs text-muted-foreground">{issue.issueKey} </span>
              )}
              {issue.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Module 2's version comparison (BRD: scope-diff two releases' tagged issues) - "moved out of a
 * release" isn't shown since fixVersion removals were never audit-logged (see the backend's
 * compare() doc comment); this only diffs each release's current issue set. */
/** Gap-closure: issues that were in a release and later removed from its fix versions. */
function MovedOutColumn({ title, issues }: { title: string; issues: ReleaseMovedOutIssue[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({issues.length})
      </h4>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue.id} className="text-sm">
              {issue.issueKey && (
                <span className="font-mono text-xs text-muted-foreground">{issue.issueKey} </span>
              )}
              {issue.title}
              <span className="text-xs text-muted-foreground">
                {' '}
                · removed {formatDate(issue.movedOutAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ReleaseCompareModal({
  projectId,
  releases,
  open,
  onClose,
}: ReleaseCompareModalProps) {
  const [releaseIdA, setReleaseIdA] = useState<string | undefined>(undefined)
  const [releaseIdB, setReleaseIdB] = useState<string | undefined>(undefined)
  const { data, isLoading, isFetching } = useReleaseCompare(projectId, releaseIdA, releaseIdB)

  function handleOpenChange(next: boolean) {
    if (!next) {
      onClose()
      setReleaseIdA(undefined)
      setReleaseIdB(undefined)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Compare releases" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Release A" htmlFor="compare-release-a">
            <Select value={releaseIdA ?? ''} onValueChange={setReleaseIdA}>
              <SelectTrigger id="compare-release-a">
                <SelectValue placeholder="Select a release" />
              </SelectTrigger>
              <SelectContent>
                {releases.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Release B" htmlFor="compare-release-b">
            <Select value={releaseIdB ?? ''} onValueChange={setReleaseIdB}>
              <SelectTrigger id="compare-release-b">
                <SelectValue placeholder="Select a release" />
              </SelectTrigger>
              <SelectContent>
                {releases.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {releaseIdA && releaseIdB && (
          <>
            {isLoading || isFetching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Comparing…
              </div>
            ) : data ? (
              <>
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <IssueColumn title="Only in A" issues={data.onlyInA} />
                  <IssueColumn title="Only in B" issues={data.onlyInB} />
                  <IssueColumn title="In both" issues={data.inBoth} />
                </div>
                {((data.movedOutOfA?.length ?? 0) > 0 || (data.movedOutOfB?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <MovedOutColumn title="Moved out of A" issues={data.movedOutOfA ?? []} />
                    <MovedOutColumn title="Moved out of B" issues={data.movedOutOfB ?? []} />
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  )
}
