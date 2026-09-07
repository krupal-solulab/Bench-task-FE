import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/Skeleton'
import { useComments } from '@/hooks/queries/useComments'
import { useCreateComment } from '@/hooks/mutations/useCommentMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { CommentForm } from './CommentForm'
import { CommentItem } from './CommentItem'
import type { CommentFormValues } from '@/schemas/comment.schema'

const PAGE_SIZE = 20

export function CommentList({ taskId }: { taskId: string }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { data, isLoading, isFetching, isError, error, refetch } = useComments(taskId, {
    page: 1,
    limit,
    sortOrder: 'desc',
  })
  const createComment = useCreateComment(taskId)
  const { showToast } = useToast()

  async function handleCreate(values: CommentFormValues) {
    try {
      await createComment.mutateAsync(values)
    } catch (err) {
      showToast({
        title: 'Could not post comment',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Comments</h3>
      <CommentForm onSubmit={handleCreate} />

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}

      {!isLoading && !isError && data?.data.length === 0 && (
        <EmptyState title="No comments yet" description="Be the first to comment on this task." />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {data.data.map((comment) => (
              <motion.div
                key={comment.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <CommentItem comment={comment} taskId={taskId} />
              </motion.div>
            ))}
          </AnimatePresence>

          {data.meta.hasNextPage && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                loading={isFetching}
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              >
                Load more comments
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
