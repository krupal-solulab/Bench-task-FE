import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useUsers } from '@/hooks/queries/useUsers'
import { toApiError } from '@/lib/error'

const PLACEHOLDER_ADD_ONS = ['Advanced reporting', 'Priority support', 'SSO / SAML']

export function BillingPage() {
  const { data, isLoading, isError, error, refetch } = useUsers({ page: 1, limit: 1 })

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plan" description="Your organization's plan and usage" />

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Current plan</p>
              <p className="text-2xl font-semibold">Team (placeholder)</p>
            </div>
            <div className="space-y-1 rounded-lg border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Seats in use</p>
              <p className="text-2xl font-semibold">{data.meta.total}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">Add-ons</p>
            <p className="text-xs text-muted-foreground">
              Not available yet - contact sales to enable these for your organization.
            </p>
            <ul className="space-y-1.5">
              {PLACEHOLDER_ADD_ONS.map((addOn) => (
                <li
                  key={addOn}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground"
                >
                  {addOn}
                  <span className="text-xs">Disabled</span>
                </li>
              ))}
            </ul>
          </div>

          <Button asChild variant="outline" className="gap-1">
            <a href="mailto:sales@example.com?subject=Billing%20inquiry">
              <Mail className="h-4 w-4" /> Contact sales
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
