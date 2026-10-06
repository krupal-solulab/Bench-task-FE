import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Puts the actions on their own wrapping row under the title - for pages with many actions
   * (e.g. the issue page), so a long title isn't squeezed and nothing overflows. */
  actionsBelow?: boolean
}

export function PageHeader({ title, description, actions, actionsBelow = false }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3',
        !actionsBelow && 'items-start justify-between sm:flex-row sm:items-center',
      )}
    >
      <div className={cn(actionsBelow && 'min-w-0')}>
        <h1 className={cn('text-2xl font-semibold tracking-tight', actionsBelow && 'break-words')}>
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className={cn('flex items-center gap-2', actionsBelow ? 'flex-wrap' : 'shrink-0')}>
          {actions}
        </div>
      )}
    </div>
  )
}
