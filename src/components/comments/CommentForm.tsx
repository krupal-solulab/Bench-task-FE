import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCannedResponses } from '@/hooks/queries/useCannedResponses'
import { commentSchema, type CommentFormValues } from '@/schemas/comment.schema'

// Placeholder-only "AI draft assist" - no LLM call, just a few canned suggestions to insert.
const AI_SUGGESTIONS = [
  "Thanks for flagging this - we're looking into it now.",
  "This has been resolved. Let us know if you're still seeing the issue.",
  'We could use a bit more detail to reproduce this - could you share the steps you took?',
]

export function CommentForm({
  onSubmit,
}: {
  onSubmit: (values: CommentFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({ resolver: zodResolver(commentSchema) })
  const { data: cannedResponses } = useCannedResponses()
  const body = watch('body')

  function insertCannedResponse(id: string) {
    const response = (cannedResponses ?? []).find((r) => r.id === id)
    if (!response) return
    const next = body ? `${body}\n${response.body}` : response.body
    setValue('body', next, { shouldValidate: true })
  }

  function insertAiSuggestion() {
    const suggestion = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)]!
    const next = body ? `${body}\n${suggestion}` : suggestion
    setValue('body', next, { shouldValidate: true })
  }

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {(cannedResponses ?? []).length > 0 && (
            <Select onValueChange={insertCannedResponse} value="">
              <SelectTrigger aria-label="Canned response" className="h-8 w-48 text-xs">
                <SelectValue placeholder="Canned response…" />
              </SelectTrigger>
              <SelectContent>
                {(cannedResponses ?? []).map((response) => (
                  <SelectItem key={response.id} value={response.id}>
                    {response.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={insertAiSuggestion}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Suggest
          </Button>
        </div>
        <Button type="submit" size="sm" loading={isSubmitting}>
          Comment
        </Button>
      </div>
    </form>
  )
}
