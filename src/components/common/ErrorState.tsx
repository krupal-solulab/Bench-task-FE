import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retrying?: boolean
}

export function ErrorState({ message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex animate-fade-in-up flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.03] py-14 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <p className="max-w-sm text-sm text-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying}>
          Retry
        </Button>
      )}
    </div>
  )
}
