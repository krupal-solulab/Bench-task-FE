import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { teamsService } from '@/services/teams.service'
import type { CreateTeamPayload, UpdateTeamPayload } from '@/types/team.types'

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => teamsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useUpdateTeam(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTeamPayload) => teamsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}
