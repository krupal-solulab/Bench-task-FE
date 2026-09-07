import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Paginated } from '@/services/api-client'
import { commentsService } from '@/services/comments.service'
import { useAuth } from '../useAuth'
import type { Comment, CreateCommentPayload, UpdateCommentPayload } from '@/types/comment.types'

function patchCommentLists(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  updater: (page: Paginated<Comment>) => Paginated<Comment>,
) {
  queryClient.setQueriesData<Paginated<Comment>>({ queryKey: ['comments', taskId] }, (old) =>
    old ? updater(old) : old,
  )
}

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => commentsService.create(taskId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['comments', taskId] })
      const tempId = `temp-${Date.now()}`
      const optimisticComment: Comment = {
        id: tempId,
        taskId,
        body: payload.body,
        author: user!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      patchCommentLists(queryClient, taskId, (page) => ({
        ...page,
        data: [optimisticComment, ...page.data],
        meta: { ...page.meta, total: page.meta.total + 1 },
      }))
      return { tempId }
    },
    onError: (_err, _payload, context) => {
      if (!context) return
      patchCommentLists(queryClient, taskId, (page) => ({
        ...page,
        data: page.data.filter((c) => c.id !== context.tempId),
        meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
      }))
    },
    onSuccess: (comment, _payload, context) => {
      patchCommentLists(queryClient, taskId, (page) => ({
        ...page,
        data: page.data.map((c) => (c.id === context?.tempId ? comment : c)),
      }))
    },
  })
}

export function useUpdateComment(taskId: string, commentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCommentPayload) => commentsService.update(commentId, payload),
    onSuccess: (updated) => {
      patchCommentLists(queryClient, taskId, (page) => ({
        ...page,
        data: page.data.map((c) => (c.id === commentId ? updated : c)),
      }))
    },
  })
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => commentsService.remove(commentId),
    onSuccess: (_data, commentId) => {
      patchCommentLists(queryClient, taskId, (page) => ({
        ...page,
        data: page.data.filter((c) => c.id !== commentId),
        meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
      }))
    },
  })
}
