import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Paginated } from '@/services/api-client'
import { attachmentsService } from '@/services/attachments.service'
import type { Attachment } from '@/types/attachment.types'

function patchAttachmentLists(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  updater: (page: Paginated<Attachment>) => Paginated<Attachment>,
) {
  queryClient.setQueriesData<Paginated<Attachment>>({ queryKey: ['attachments', taskId] }, (old) =>
    old ? updater(old) : old,
  )
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => attachmentsService.upload(taskId, file),
    onSuccess: (attachment) => {
      patchAttachmentLists(queryClient, taskId, (page) => ({
        ...page,
        data: [attachment, ...page.data],
        meta: { ...page.meta, total: page.meta.total + 1 },
      }))
    },
  })
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => attachmentsService.remove(attachmentId),
    onSuccess: (_data, attachmentId) => {
      patchAttachmentLists(queryClient, taskId, (page) => ({
        ...page,
        data: page.data.filter((a) => a.id !== attachmentId),
        meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
      }))
    },
  })
}
