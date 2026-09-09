import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { attachmentsService } from '@/services/attachments.service'
import type { AttachmentListQuery } from '@/types/attachment.types'

export function useTaskAttachments(taskId: string | undefined, query: AttachmentListQuery) {
  return useQuery({
    queryKey: queryKeys.attachments.list(taskId ?? '', query),
    queryFn: () => attachmentsService.list(taskId!, query),
    enabled: !!taskId,
    placeholderData: (prev) => prev,
  })
}
