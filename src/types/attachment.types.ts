import type { User } from './user.types'

export interface Attachment {
  id: string
  taskId: string
  filename: string
  mimeType: string
  size: number
  uploadedBy: User
  createdAt: string
  updatedAt: string
}

export interface AttachmentListQuery {
  page?: number
  limit?: number
}
