import { apiDelete, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  Comment,
  CommentListQuery,
  CreateCommentPayload,
  UpdateCommentPayload,
} from '@/types/comment.types'

export const commentsService = {
  list: (taskId: string, query: CommentListQuery) =>
    apiGetPaginated<Comment>(`/tasks/${taskId}/comments`, query),

  create: (taskId: string, payload: CreateCommentPayload) =>
    apiPost<Comment>(`/tasks/${taskId}/comments`, payload),

  update: (id: string, payload: UpdateCommentPayload) =>
    apiPatch<Comment>(`/comments/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/comments/${id}`),
}
