import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { cannedResponsesService } from '@/services/cannedResponses.service'

export function useCannedResponses() {
  return useQuery({
    queryKey: queryKeys.cannedResponses.all,
    queryFn: () => cannedResponsesService.list(),
  })
}
