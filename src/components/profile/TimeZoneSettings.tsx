import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/hooks/mutations/useAuthMutations'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, listTimeZones, modernTimeZoneName } from '@/lib/date'
import { toApiError } from '@/lib/error'

const BROWSER_DEFAULT = ''

/** Module 11 gap-closure - the user's display time zone, saved as soon as it's picked. */
export function TimeZoneSettings() {
  const { user, updateUser } = useAuth()
  const updateProfile = useUpdateProfile()
  const { showToast } = useToast()
  const zones = useMemo(() => listTimeZones([user?.timezone]), [user?.timezone])
  const browserZone = modernTimeZoneName(Intl.DateTimeFormat().resolvedOptions().timeZone)

  if (!user) return null

  async function handleChange(value: string) {
    try {
      const updated = await updateProfile.mutateAsync({ timezone: value || null })
      updateUser(updated)
      showToast({ title: 'Time zone updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update time zone',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5 shadow-soft">
      <div>
        <h2 className="font-medium">Time zone</h2>
        <p className="text-sm text-muted-foreground">
          Times across the app are shown in this zone. Right now it's{' '}
          {formatDateTime(new Date().toISOString())}.
        </p>
      </div>
      <select
        aria-label="Time zone"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={user.timezone ?? BROWSER_DEFAULT}
        disabled={updateProfile.isPending}
        onChange={(e) => void handleChange(e.target.value)}
      >
        <option value={BROWSER_DEFAULT}>Browser default ({browserZone})</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </section>
  )
}
