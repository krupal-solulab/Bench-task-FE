import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { workflowTemplatesService } from '@/services/workflowTemplates.service'

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: queryKeys.workflowTemplates.all,
    queryFn: () => workflowTemplatesService.list(),
  })
}
