import { PageHeader } from '@/components/layout/PageHeader'
import { LinkTypesSettingsForm } from '@/components/admin/LinkTypesSettingsForm'

export function LinkTypesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Link types"
        description="Define the issue-link types available across every project (Blocks, Relates To, Duplicates, ...)"
      />
      <div className="rounded-xl border bg-card p-5 shadow-soft">
        <LinkTypesSettingsForm />
      </div>
    </div>
  )
}
