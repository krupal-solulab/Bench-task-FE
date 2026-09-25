export interface ProjectRole {
  id: string
  organizationId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRolePayload {
  name: string
  description?: string
}

export type UpdateProjectRolePayload = Partial<CreateProjectRolePayload>
