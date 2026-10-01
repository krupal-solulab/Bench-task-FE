import { Bold, Code, Italic, Link as LinkIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { MarkdownFormatKind } from '@/lib/markdown-format'

const BUTTONS: {
  kind: MarkdownFormatKind
  label: string
  Icon: ComponentType<{ className?: string }>
}[] = [
  { kind: 'bold', label: 'Bold', Icon: Bold },
  { kind: 'italic', label: 'Italic', Icon: Italic },
  { kind: 'link', label: 'Link', Icon: LinkIcon },
  { kind: 'code', label: 'Code', Icon: Code },
]

/** Module 7 gap-closure - the Bold/Italic/Link/Code row shared by CommentForm and CommentItem's
 * inline edit textarea. Purely inserts markdown syntax (see lib/markdown-format.ts); rendering it
 * is CommentBody's job. */
export function FormattingToolbar({ onFormat }: { onFormat: (kind: MarkdownFormatKind) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {BUTTONS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onFormat(kind)}
          aria-label={label}
          title={label}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
