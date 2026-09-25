import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotifications } from '@/hooks/queries/useNotifications'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/mutations/useNotificationMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useToast } from '@/hooks/useToast'
import { formatRelativeTime } from '@/lib/date'
import { cn } from '@/lib/cn'
import { toApiError } from '@/lib/error'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/notifications'
import {
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationType,
} from '@/types/notification.types'

const ALL = '__all__'

/** Module 11's Notifications Center - the bell dropdown (`NotificationBell.tsx`) stays a
 * lightweight 10-item preview; this page is the full paginated, filterable history it links to. */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    type: undefined as NotificationType | undefined,
    unreadOnly: false as boolean,
  })

  const { data, isLoading, isFetching } = useNotifications(state)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const hasActiveFilters = !!state.type || state.unreadOnly

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

  function handleClearFilters() {
    setState({ type: undefined, unreadOnly: false, page: 1 })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Everything that's happened across your projects and tasks"
        actions={
          <Button variant="outline" size="sm" onClick={() => void handleMarkAllRead()}>
            <Check className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-soft">
        <div className="w-56 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select
            value={state.type ?? ALL}
            onValueChange={(v) =>
              setState({ type: v === ALL ? undefined : (v as NotificationType), page: 1 })
            }
          >
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {NOTIFICATION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={state.unreadOnly}
            onCheckedChange={(checked) => setState({ unreadOnly: checked === true, page: 1 })}
          />
          Unread only
        </label>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={Bell}
          title={hasActiveFilters ? 'No notifications match these filters' : "You're all caught up"}
          description={
            hasActiveFilters ? undefined : 'New activity on your tasks and projects shows up here.'
          }
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      )}

      <div
        className={cn('space-y-2', isFetching && 'opacity-60 transition-opacity')}
        aria-busy={isFetching}
      >
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleSelect(notification)}
            className={cn(
              'flex w-full flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left shadow-soft transition-colors hover:bg-accent/40',
              !notification.read && 'border-primary/30 bg-accent/20',
            )}
          >
            <span className="flex w-full items-center gap-2 font-medium">
              {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              {notification.title}
              <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                {formatRelativeTime(notification.createdAt)}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">{notification.message}</span>
          </button>
        ))}
      </div>

      {data && (
        <Pagination
          page={data.meta.page}
          limit={data.meta.limit}
          total={data.meta.total}
          totalPages={data.meta.totalPages}
          onPageChange={(page) => setState({ page })}
          onLimitChange={(limit) => setState({ limit, page: 1 })}
        />
      )}
    </div>
  )
}
