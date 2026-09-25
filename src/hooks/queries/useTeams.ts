import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { teamsService } from '@/services/teams.service'

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: () => teamsService.list(),
  })
}
