import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  // Module 5 gap-closure: an optional inline action (e.g. "Undo") - additive, every existing
  // showToast() call keeps working unchanged since this is never required.
  action?: { label: string; onClick: () => void }
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const AUTO_DISMISS_MS = 5000
// A toast with an inline action (e.g. "Undo") needs longer than the default 5s to actually be
// clickable - this doesn't need to cover the server's full 5-minute undo window, just give a
// realistic chance to notice and click, matching common "Undo" toast conventions elsewhere.
const AUTO_DISMISS_WITH_ACTION_MS = 10000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { ...toast, id }])
      const duration = toast.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS
      window.setTimeout(() => dismissToast(id), duration)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
