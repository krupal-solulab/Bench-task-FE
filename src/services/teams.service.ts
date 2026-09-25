import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type { CreateTeamPayload, Team, UpdateTeamPayload } from '@/types/team.types'

export const teamsService = {
  list: () => apiGet<Team[]>('/teams'),

  get: (id: string) => apiGet<Team>(`/teams/${id}`),

  create: (payload: CreateTeamPayload) => apiPost<Team>('/teams', payload),

  update: (id: string, payload: UpdateTeamPayload) => apiPatch<Team>(`/teams/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/teams/${id}`),
}
