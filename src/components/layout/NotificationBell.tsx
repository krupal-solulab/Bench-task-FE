import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useNotificationPreferences,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/queries/useNotifications'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUpdateNotificationPreferences,
} from '@/hooks/mutations/useNotificationMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { formatRelativeTime } from '@/lib/date'
import { cn } from '@/lib/cn'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/notifications'
import {
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationType,
} from '@/types/notification.types'

/** Bell + inbox dropdown embedded in the Topbar. Module 11 added a dedicated `/notifications`
 * page (with real pagination and filters) for the full history - this dropdown stays a
 * lightweight 10-item preview with a "View all" link into that page. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: unread } = useUnreadNotificationCount()
  const { data: page } = useNotifications({ limit: 10 })
  const { data: preferences } = useNotificationPreferences()

  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const updatePreferences = useUpdateNotificationPreferences()

  const unreadCount = unread?.count ?? 0
  const notifications = page?.data ?? []
  const mutedTypes = preferences?.mutedTypes ?? []

  function handleSelect(notification: Notification) {
    if (!notification.read) markRead.mutate(notification.id)
    if (notification.taskId) navigate(`/tasks/${notification.taskId}`)
    else if (notification.projectId) navigate(`/projects/${notification.projectId}`)
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync()
    } catch (err) {
      showToast({
        title: 'Could not mark notifications as read',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function toggleMuted(type: NotificationType) {
    const next = mutedTypes.includes(type)
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type]
    try {
      await updatePreferences.mutateAsync({ mutedTypes: next })
    } catch (err) {
      showToast({
        title: 'Could not update notification preferences',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={unreadCount === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <Check className="h-3 w-3" /> Mark all read
          </button>
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        )}
        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            onSelect={() => handleSelect(notification)}
            className={cn('flex flex-col items-start gap-0.5 whitespace-normal py-2', {
              'bg-accent/40': !notification.read,
            })}
          >
            <span className="flex w-full items-center gap-1.5 font-medium">
              {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              {notification.title}
            </span>
            <span className="text-xs text-muted-foreground">{notification.message}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/notifications')} className="justify-center">
          View all
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Notify me about</DropdownMenuLabel>
        {NOTIFICATION_TYPES.map((type) => (
          <DropdownMenuCheckboxItem
            key={type}
            checked={!mutedTypes.includes(type)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => void toggleMuted(type)}
          >
            {NOTIFICATION_TYPE_LABELS[type]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
