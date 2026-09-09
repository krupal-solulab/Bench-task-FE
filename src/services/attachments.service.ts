import { apiDelete, apiGet, apiGetPaginated, apiUpload } from './api-client'
import type { Attachment, AttachmentListQuery } from '@/types/attachment.types'

export const attachmentsService = {
  list: (taskId: string, query: AttachmentListQuery) =>
    apiGetPaginated<Attachment>(`/tasks/${taskId}/attachments`, query),

  upload: (taskId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiUpload<Attachment>(`/tasks/${taskId}/attachments`, formData)
  },

  getDownloadUrl: (id: string) => apiGet<{ url: string }>(`/attachments/${id}/download`),

  remove: (id: string) => apiDelete<void>(`/attachments/${id}`),
}
