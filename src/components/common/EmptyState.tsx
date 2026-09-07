import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/** Distinguish "no data yet" from "no results for filters" by passing a different title/description/CTA. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in-up flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
