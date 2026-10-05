import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useNotificationDigest } from '@/hooks/queries/useNotifications'
import { cn } from '@/lib/cn'

/** Module 11 gap-closure - the in-app digest: unread notifications from the last day or week,
 * counted by type. The same summary is what the digest email contains. */
export function DigestCard() {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const { data: digest, isLoading } = useNotificationDigest(period)

  return (
    <section
      aria-label="Notification digest"
      className="space-y-2 rounded-xl border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium">Your digest</h2>
        <div className="ml-auto flex gap-1 text-xs" role="group" aria-label="Digest period">
          {(['daily', 'weekly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-full px-2.5 py-0.5',
                period === p ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              {p === 'daily' ? 'Last 24 hours' : 'Last 7 days'}
            </button>
          ))}
        </div>
      </div>
      {isLoading || !digest ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : digest.unreadCount === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing unread in this period.</p>
      ) : (
        <>
          <p className="text-sm">
            {digest.unreadCount} unread notification{digest.unreadCount === 1 ? '' : 's'}
          </p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {digest.byType.map((t) => (
              <li key={t.type} className="rounded-full bg-muted px-2.5 py-0.5">
                {t.label}: {t.count}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
