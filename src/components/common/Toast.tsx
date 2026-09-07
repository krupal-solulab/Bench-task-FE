import { CheckCircle2, X, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import type { ToastVariant } from '@/context/ToastContext'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-success/30 bg-success/10 text-success-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') return <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
  if (variant === 'destructive') return <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
  return null
}

export function ToastViewport() {
  const { toasts, dismissToast } = useToast()

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-2 rounded-lg border p-4 shadow-lg',
            VARIANT_STYLES[toast.variant],
          )}
        >
          <VariantIcon variant={toast.variant} />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && <p className="text-sm opacity-90">{toast.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
