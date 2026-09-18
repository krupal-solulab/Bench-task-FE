import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/common/Button'
import { useUpdateNotificationScheme } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_SCHEME_EVENTS,
  NOTIFICATION_SCHEME_EVENT_LABELS,
} from '@/types/notification-scheme.types'
import type {
  NotificationChannel,
  NotificationSchemeEvent,
  NotificationSchemeRule,
} from '@/types/notification-scheme.types'
import { ORG_ROLES } from '@/types/user.types'
import type { OrgRole } from '@/types/user.types'

export interface NotificationSchemeFormProps {
  projectId: string
  notificationScheme: NotificationSchemeRule[]
  canManage: boolean
}

/** A fixed catalog of 5 events (unlike Automation Rules' user-authored list) - every row always
 * renders, defaulted to "nobody" for an event the project hasn't configured. Additive on top of
 * the existing hardcoded assignee-targeted notifications; this only adds extra role-based
 * recipients on top, never replaces them. */
function withAllEvents(rules: NotificationSchemeRule[]): NotificationSchemeRule[] {
  const byEvent = new Map(rules.map((r) => [r.event, r]))
  return NOTIFICATION_SCHEME_EVENTS.map(
    (event) => byEvent.get(event) ?? { event, notifyRoles: [], channels: [] },
  )
}

export function NotificationSchemeForm({
  projectId,
  notificationScheme,
  canManage,
}: NotificationSchemeFormProps) {
  const [rules, setRules] = useState<NotificationSchemeRule[]>(withAllEvents(notificationScheme))
  const updateNotificationScheme = useUpdateNotificationScheme(projectId)
  const { showToast } = useToast()

  function updateRule(event: NotificationSchemeEvent, patch: Partial<NotificationSchemeRule>) {
    setRules(rules.map((r) => (r.event === event ? { ...r, ...patch } : r)))
  }

  function toggleRole(event: NotificationSchemeEvent, role: OrgRole, checked: boolean) {
    const rule = rules.find((r) => r.event === event)!
    const next = checked ? [...rule.notifyRoles, role] : rule.notifyRoles.filter((r) => r !== role)
    updateRule(event, { notifyRoles: next })
  }

  function toggleChannel(
    event: NotificationSchemeEvent,
    channel: NotificationChannel,
    checked: boolean,
  ) {
    const rule = rules.find((r) => r.event === event)!
    const next = checked ? [...rule.channels, channel] : rule.channels.filter((c) => c !== channel)
    updateRule(event, { channels: next })
  }

  const canSave =
    canManage && rules.every((r) => r.notifyRoles.length === 0 || r.channels.length > 0)
  const configuredRules = rules.filter((r) => r.notifyRoles.length > 0)

  async function handleSave() {
    try {
      const saved = await updateNotificationScheme.mutateAsync(rules)
      setRules(withAllEvents(saved.notificationScheme))
      showToast({ title: 'Notification scheme updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update notification scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Notification scheme</h3>
        {configuredRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extra notification routing configured - only the default assignee notifications
            apply.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {configuredRules.map((r) => (
              <li key={r.event}>
                {NOTIFICATION_SCHEME_EVENT_LABELS[r.event]}: notifies {r.notifyRoles.join(', ')} via{' '}
                {r.channels.map((c) => NOTIFICATION_CHANNEL_LABELS[c]).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Notification scheme</h3>
        <p className="text-xs text-muted-foreground">
          Optionally notify additional roles, over additional channels, for each event below - on
          top of the default assignee notifications, which always apply regardless of this
          configuration.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.event} className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">{NOTIFICATION_SCHEME_EVENT_LABELS[rule.event]}</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Notify:</span>
                {ORG_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1 text-xs">
                    <Checkbox
                      aria-label={`Notify ${role} on ${NOTIFICATION_SCHEME_EVENT_LABELS[rule.event]}`}
                      checked={rule.notifyRoles.includes(role)}
                      onCheckedChange={(checked) => toggleRole(rule.event, role, checked === true)}
                    />
                    {role}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Via:</span>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-center gap-1 text-xs">
                    <Checkbox
                      aria-label={`Notify via ${NOTIFICATION_CHANNEL_LABELS[channel]} on ${NOTIFICATION_SCHEME_EVENT_LABELS[rule.event]}`}
                      checked={rule.channels.includes(channel)}
                      onCheckedChange={(checked) =>
                        toggleChannel(rule.event, channel, checked === true)
                      }
                    />
                    {NOTIFICATION_CHANNEL_LABELS[channel]}
                  </label>
                ))}
              </div>
            </div>
            {rule.notifyRoles.length > 0 && rule.channels.length === 0 && (
              <p className="text-xs text-destructive">Select at least one channel.</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateNotificationScheme.isPending}
          disabled={!canSave}
        >
          Save notification scheme
        </Button>
      </div>
    </div>
  )
}
