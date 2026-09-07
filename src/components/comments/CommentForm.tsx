import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/ui/textarea'
import { commentSchema, type CommentFormValues } from '@/schemas/comment.schema'

export function CommentForm({
  onSubmit,
}: {
  onSubmit: (values: CommentFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({ resolver: zodResolver(commentSchema) })

  async function submit(values: CommentFormValues) {
    await onSubmit(values)
    reset()
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          void handleSubmit(submit)()
        }
      }}
      className="space-y-2"
      noValidate
    >
      <Textarea
        {...register('body')}
        rows={3}
        placeholder="Add a comment… (Ctrl/Cmd+Enter to submit)"
        aria-label="Add a comment"
        aria-invalid={!!errors.body}
      />
      {errors.body && (
        <p role="alert" className="text-xs text-destructive">
          {errors.body.message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Comment
        </Button>
      </div>
    </form>
  )
}
