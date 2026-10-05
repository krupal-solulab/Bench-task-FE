import { useNotificationPreferences } from '@/hooks/queries/useNotifications'
import { useUpdateNotificationPreferences } from '@/hooks/mutations/useNotificationMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { DigestFrequency } from '@/types/notification.types'

const LABELS: Record<DigestFrequency, string> = {
  off: 'Off',
  daily: 'Daily',
  weekly: 'Weekly',
}

/** Module 11 gap-closure - how often to get a digest of unread notifications. Emails only go
 * out once the server has email (SMTP) configured; the in-app digest always works. */
export function DigestSettings() {
  const { data: preferences } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const { showToast } = useToast()
  const current = preferences?.digest ?? 'off'

  async function handleChange(digest: DigestFrequency) {
    try {
      await updatePreferences.mutateAsync({ mutedTypes: preferences?.mutedTypes ?? [], digest })
      showToast({
        title: digest === 'off' ? 'Digest turned off' : `${LABELS[digest]} digest turned on`,
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not update the digest',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <label htmlFor="digest-frequency">
        Digest email of unread notifications
        <span className="block text-xs text-muted-foreground">
          Also shown at the top of your Notifications page.
        </span>
      </label>
      <select
        id="digest-frequency"
        className="h-9 rounded-md border bg-background px-3 text-sm"
        value={current}
        disabled={!preferences || updatePreferences.isPending}
        onChange={(e) => void handleChange(e.target.value as DigestFrequency)}
      >
        {(Object.keys(LABELS) as DigestFrequency[]).map((value) => (
          <option key={value} value={value}>
            {LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  )
}
