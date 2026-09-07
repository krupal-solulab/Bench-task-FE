import type { SortOrder } from './api.types'
import type { User } from './user.types'

export interface Comment {
  id: string
  taskId: string
  body: string
  author: User
  createdAt: string
  updatedAt: string
}

export interface CommentListQuery {
  page?: number
  limit?: number
  sortOrder?: SortOrder
}

export interface CreateCommentPayload {
  body: string
}

export interface UpdateCommentPayload {
  body: string
}
