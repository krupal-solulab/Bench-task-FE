import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { useReleaseNotes } from '@/hooks/queries/useReleases'
import type { Release } from '@/types/release.types'

export interface ReleaseNotesModalProps {
  projectId: string
  release: Release | null
  onClose: () => void
}

/** Displays the auto-drafted release notes (see release-notes.util.ts on the backend) - a
 * deterministic composer from real completed-issue data, not a real LLM call, rendered as plain
 * markdown text (no markdown-rendering library is installed in this codebase). */
export function ReleaseNotesModal({ projectId, release, onClose }: ReleaseNotesModalProps) {
  const { data, isLoading } = useReleaseNotes(projectId, release?.id, { enabled: !!release })

  return (
    <Modal
      open={!!release}
      onOpenChange={(open) => !open && onClose()}
      title={`Release notes - ${release?.name ?? ''}`}
      size="lg"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Generating…
        </div>
      ) : (
        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-sans text-sm">
          {data?.markdown}
        </pre>
      )}
    </Modal>
  )
}
