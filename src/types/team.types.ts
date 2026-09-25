import type { User } from './user.types'

export interface Team {
  id: string
  organizationId: string
  name: string
  description: string
  // Still named "*Id" even though the API populates it (same convention as Project.owner) - it's
  // a full User once populated, not a bare id string.
  leadId: User | null
  memberIds: User[]
  createdAt: string
  updatedAt: string
}

export interface CreateTeamPayload {
  name: string
  description?: string
  leadId?: string | null
  memberIds?: string[]
}

export type UpdateTeamPayload = Partial<CreateTeamPayload>
