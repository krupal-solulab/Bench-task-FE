import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectInvitesService } from '@/services/project-invites.service'

export function useProjectInvites(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects.invites(projectId),
    queryFn: () => projectInvitesService.list(projectId),
    enabled: !!projectId && enabled,
  })
}
