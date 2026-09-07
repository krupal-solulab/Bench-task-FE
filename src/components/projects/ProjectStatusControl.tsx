import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useUpdateProjectStatus } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { legalProjectTransitions } from '@/lib/status-transitions'
import type { Project, ProjectStatus } from '@/types/project.types'

export function ProjectStatusControl({
  project,
  disabled,
}: {
  project: Project
  disabled?: boolean
}) {
  const [pending, setPending] = useState(false)
  const updateStatus = useUpdateProjectStatus(project.id)
  const { showToast } = useToast()

  const legalTargets = legalProjectTransitions(project.status)

  if (disabled || legalTargets.length === 0) {
    return <StatusBadge status={project.status} kind="project" />
  }

  async function handleChange(next: string) {
    setPending(true)
    try {
      await updateStatus.mutateAsync(next as ProjectStatus)
      showToast({ title: `Project moved to ${next}`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not change status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Select value={project.status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-44" aria-label="Change project status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={project.status}>{project.status} (current)</SelectItem>
        {legalTargets.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
