export interface CannedResponse {
  id: string
  organizationId: string
  createdBy: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface CreateCannedResponsePayload {
  title: string
  body: string
}

export interface UpdateCannedResponsePayload {
  title?: string
  body?: string
}
