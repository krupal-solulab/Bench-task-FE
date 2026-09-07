import { PageHeader } from '@/components/layout/PageHeader'
import { CardSkeleton } from '@/components/common/Skeleton'

/** Placeholder shell for Phase 1 — replaced with the full dashboard (stat cards + charts) in Phase 5. */
export function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Organization overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}
