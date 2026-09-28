import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { issueTemplatesService } from '@/services/issue-templates.service'

/** Without `projectId`, every template in the org (the management page's own listing). With it,
 * org-wide templates plus the ones scoped to that project - the set a New Task form may offer. */
export function useIssueTemplates(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.issueTemplates.all(projectId ?? null),
    queryFn: () => issueTemplatesService.list(projectId),
  })
}
