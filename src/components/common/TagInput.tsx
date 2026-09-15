import { X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

export interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  /** When given, entry is restricted to these values (a picker) instead of free text. */
  suggestions?: string[]
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

/** Small dependency-free chip input. With `suggestions`, only listed values may be added
 * (used for the fixed Components pick-list); without it, any typed text is accepted
 * (used for free-form Labels). */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
  id,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const generatedId = useId()
  const inputId = id ?? generatedId

  const matches = useMemo(() => {
    if (!suggestions) return []
    const term = draft.trim().toLowerCase()
    return suggestions.filter(
      (s) => !value.includes(s) && (!term || s.toLowerCase().includes(term)),
    )
  }, [suggestions, draft, value])

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    if (suggestions && !suggestions.includes(tag)) return
    if (value.includes(tag)) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]!)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="h-6 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        )}
      </div>
      {suggestions && !disabled && matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-dashed border-input px-2 py-0.5 text-xs text-muted-foreground hover:border-solid hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
