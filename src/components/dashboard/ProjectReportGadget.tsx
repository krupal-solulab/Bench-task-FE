import type { ReactNode } from 'react'
import { ChartCard } from '@/components/dashboard/ChartCard'

/** Module 9 gap-closure - wraps a project-scoped report as a dashboard gadget: these reports
 * describe one project's flow, so with "All projects" selected the gadget asks for one instead
 * of guessing. */
export function ProjectReportGadget({
  title,
  projectId,
  children,
}: {
  title: string
  projectId?: string
  children: (projectId: string) => ReactNode
}) {
  if (projectId) return <>{children(projectId)}</>
  return (
    <ChartCard
      title={title}
      isLoading={false}
      isError={false}
      isEmpty
      emptyMessage="Choose a project in the filter above to see this report."
    >
      {null}
    </ChartCard>
  )
}
