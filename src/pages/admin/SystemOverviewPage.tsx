import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  FolderKanban,
  ListChecks,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { StatCard } from '@/components/dashboard/StatCard'
import { useAdminSystemStats } from '@/hooks/queries/useAdminConsole'
import { formatAuditAction } from '@/lib/audit-log'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { ORG_ROLES } from '@/types/user.types'
import { PROJECT_STATUSES } from '@/types/project.types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Module 8 gap-closure - the org Admin's system dashboard: people, projects, work and admin
 * activity across the whole organization, in one place. */
export function SystemOverviewPage() {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useAdminSystemStats()

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="System overview" />
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System overview"
        description="Organization-wide health: people, projects, work in flight and recent admin activity"
        actions={
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active users"
          value={stats ? `${stats.users.active} / ${stats.users.total}` : '—'}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          label="Projects"
          value={stats?.projects.total ?? '—'}
          icon={FolderKanban}
          isLoading={isLoading}
        />
        <StatCard
          label="Open tasks"
          value={stats?.tasks.open ?? '—'}
          icon={ListChecks}
          isLoading={isLoading}
        />
        <StatCard
          label="Overdue tasks"
          value={stats?.tasks.overdue ?? '—'}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <StatCard
          label="Active sprints"
          value={stats?.sprints.active ?? '—'}
          icon={Zap}
          isLoading={isLoading}
        />
        <StatCard
          label="Archived projects"
          value={stats?.projects.archived ?? '—'}
          icon={Archive}
          isLoading={isLoading}
        />
        <StatCard
          label="Tasks completed (7 days)"
          value={stats?.tasks.completedLast7Days ?? '—'}
          icon={ListChecks}
          isLoading={isLoading}
        />
        <StatCard
          label="Admin changes (7 days)"
          value={stats?.activity.auditEventsLast7Days ?? '—'}
          icon={Activity}
          isLoading={isLoading}
        />
      </div>

      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Users by role">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 text-right font-medium">Active</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ORG_ROLES.map((role) => (
                  <tr key={role} className="border-t">
                    <td className="py-1.5">{role}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {stats.users.byRole[role]?.active ?? 0}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {stats.users.byRole[role]?.total ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.users.inactive > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.users.inactive} deactivated user{stats.users.inactive === 1 ? '' : 's'}
              </p>
            )}
          </Section>

          <Section title="Projects by status">
            <ul className="space-y-1.5 text-sm">
              {PROJECT_STATUSES.map((status) => (
                <li key={status} className="flex justify-between">
                  <span>{status}</span>
                  <span className="tabular-nums">{stats.projects.byStatus[status] ?? 0}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.projects.createdLast30Days} created in the last 30 days · {stats.tasks.total}{' '}
              tasks in total
            </p>
          </Section>

          <Section title="Recent admin activity">
            {stats.activity.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin changes recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats.activity.recent.map((entry) => (
                  <li key={entry.id}>
                    <p>
                      <span className="font-medium">{entry.actor.name}</span>{' '}
                      {formatAuditAction(entry.action).toLowerCase()}
                      {entry.targetLabel ? ` · ${entry.targetLabel}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/admin/audit-log"
              className="mt-3 inline-block text-xs text-primary underline"
            >
              View full audit log
            </Link>
          </Section>
        </div>
      )}
    </div>
  )
}
