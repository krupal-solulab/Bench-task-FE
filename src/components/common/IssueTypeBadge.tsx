import { Layers } from 'lucide-react'
import { ISSUE_TYPE_COLOR_CLASSES } from '@/lib/constants'
import { ISSUE_TYPE_ICON_COMPONENTS } from '@/lib/issue-type-icons'
import { cn } from '@/lib/cn'
import { DEFAULT_ISSUE_TYPES, type IssueTypeDefinition } from '@/types/issue-type.types'

export interface IssueTypeBadgeProps {
  issueType: string
  /** The owning project's resolved issue types (see resolveIssueTypes) - falls back to the 5
   * built-in defaults when omitted (e.g. a cross-project list that can't resolve one project's
   * customization), and further falls back to a generic badge if the name isn't found at all. */
  definitions?: IssueTypeDefinition[]
  className?: string
}

export function IssueTypeBadge({ issueType, definitions, className }: IssueTypeBadgeProps) {
  const definition = (definitions ?? DEFAULT_ISSUE_TYPES).find((t) => t.name === issueType)
  const Icon = definition ? ISSUE_TYPE_ICON_COMPONENTS[definition.icon] : Layers
  const colorClass = definition
    ? ISSUE_TYPE_COLOR_CLASSES[definition.color]
    : ISSUE_TYPE_COLOR_CLASSES.slate

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        colorClass,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {issueType}
    </span>
  )
}
