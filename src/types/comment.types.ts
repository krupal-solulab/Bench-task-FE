import type { SortOrder } from './api.types'
import type { User } from './user.types'

export interface CommentEditHistoryEntry {
  body: string
  editedAt: string
}

export interface Comment {
  id: string
  taskId: string
  body: string
  author: User
  // Module 7 - derived server-side from `body`'s @[Name](userId) markup (see lib/mentions.ts).
  mentionedUserIds: User[]
  // Module 7 gap-closure: every prior body, oldest first - empty for a never-edited comment.
  editHistory: CommentEditHistoryEntry[]
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
