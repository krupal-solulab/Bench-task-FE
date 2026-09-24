import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { issueLinksService } from '@/services/issueLinks.service'

export function useTaskLinks(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.planning.taskLinks(taskId ?? ''),
    queryFn: () => issueLinksService.list(taskId!),
    enabled: !!taskId,
  })
}

/** Org-wide link type catalog (Blocks/Relates To/...) - resolves to the 5 defaults server-side
 * until an Admin customizes them (see LinkTypesSettingsForm). */
export function useLinkTypes() {
  return useQuery({
    queryKey: queryKeys.planning.linkTypes,
    queryFn: () => issueLinksService.linkTypes(),
  })
}
