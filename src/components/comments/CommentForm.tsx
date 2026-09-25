import { useRef, useState } from 'react'
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
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { commentSchema, type CommentFormValues } from '@/schemas/comment.schema'
import { findMentionQuery, insertMention } from '@/lib/mentions'

// Placeholder-only "AI draft assist" - no LLM call, just a few canned suggestions to insert.
const AI_SUGGESTIONS = [
  "Thanks for flagging this - we're looking into it now.",
  "This has been resolved. Let us know if you're still seeing the issue.",
  'We could use a bit more detail to reproduce this - could you share the steps you took?',
]

const MAX_MENTION_RESULTS = 6

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
  const { data: assignableUsers } = useAssignableUsers()
  const body = watch('body')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    ref: bodyRegisterRef,
    onChange: bodyRegisterOnChange,
    ...bodyRegisterRest
  } = register('body')

  const mentionCandidates =
    mentionQuery === null
      ? []
      : (assignableUsers?.data ?? [])
          .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, MAX_MENTION_RESULTS)

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

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const cursorIndex = e.target.selectionStart ?? e.target.value.length
    setMentionQuery(findMentionQuery(e.target.value.slice(0, cursorIndex)))
  }

  function selectMention(userId: string, name: string) {
    const textarea = textareaRef.current
    const currentBody = body ?? ''
    const cursorIndex = textarea?.selectionStart ?? currentBody.length
    const { text, cursorIndex: nextCursorIndex } = insertMention(
      currentBody,
      cursorIndex,
      name,
      userId,
    )
    setValue('body', text, { shouldValidate: true })
    setMentionQuery(null)
    // Re-focus and restore the cursor right after the inserted mention, so typing continues
    // naturally instead of jumping to the end of the textarea.
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(nextCursorIndex, nextCursorIndex)
    })
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
      <div className="relative">
        <Textarea
          {...bodyRegisterRest}
          ref={(el) => {
            bodyRegisterRef(el)
            textareaRef.current = el
          }}
          onChange={(e) => {
            void bodyRegisterOnChange(e)
            handleBodyChange(e)
          }}
          rows={3}
          placeholder="Add a comment… (type @ to mention someone, Ctrl/Cmd+Enter to submit)"
          aria-label="Add a comment"
          aria-invalid={!!errors.body}
        />
        {mentionCandidates.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border bg-popover p-1 shadow-card-hover">
            {mentionCandidates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectMention(u.id, u.name)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
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
