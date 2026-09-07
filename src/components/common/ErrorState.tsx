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
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-12 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <p className="max-w-sm text-sm text-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying}>
          Retry
        </Button>
      )}
    </div>
  )
}
