import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { commentsService } from '@/services/comments.service'
import type { CommentListQuery } from '@/types/comment.types'

export function useComments(taskId: string | undefined, query: CommentListQuery) {
  return useQuery({
    queryKey: queryKeys.comments.list(taskId ?? '', query),
    queryFn: () => commentsService.list(taskId!, query),
    enabled: !!taskId,
    placeholderData: (prev) => prev,
  })
}
