import { useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, FolderKanban, ListTodo, Settings2, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProjectStatusChart } from '@/components/dashboard/ProjectStatusChart'
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart'
import { TaskPriorityChart } from '@/components/dashboard/TaskPriorityChart'
import { DeveloperWorkloadChart } from '@/components/dashboard/DeveloperWorkloadChart'
import { TaskTrendChart } from '@/components/dashboard/TaskTrendChart'
import { OverdueList } from '@/components/dashboard/OverdueList'
import { SlaComplianceChart } from '@/components/dashboard/SlaComplianceChart'
import { VelocityTrendChart } from '@/components/dashboard/VelocityTrendChart'
import { ActiveSprintsHealthList } from '@/components/dashboard/ActiveSprintsHealthList'
import { MyOpenIssuesList } from '@/components/dashboard/MyOpenIssuesList'
import { ResolutionTimeTrendChart } from '@/components/dashboard/ResolutionTimeTrendChart'
import { DashboardCustomizeForm } from '@/components/dashboard/DashboardCustomizeForm'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardPreferences, useDashboardSummary } from '@/hooks/queries/useDashboard'
import { useProjects } from '@/hooks/queries/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { DASHBOARD_WIDGET_IDS, type DashboardWidgetId } from '@/types/dashboard.types'

const ALL_PROJECTS = '__all__'

const HEADING_BY_ROLE: Record<string, string> = {
  Admin: 'Organization overview',
  Manager: 'Your projects',
  Developer: 'Your tasks',
}

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  projectsByStatus: 'Projects by Status',
  tasksStatus: 'Task Status',
  tasksByPriority: 'Tasks by Priority',
  taskTrend: 'Task Trend',
  developerWorkload: 'Developer Workload',
  overdueList: 'Overdue Tasks',
  slaCompliance: 'SLA Compliance',
  velocityTrend: 'Velocity Trend',
  activeSprintsHealth: 'Active Sprints Health',
  myOpenIssues: 'My Open Issues',
  resolutionTimeTrend: 'Resolution Time Trend',
}

function widgetRegistry(scope: { projectId?: string }): Record<DashboardWidgetId, ReactNode> {
  return {
    projectsByStatus: <ProjectStatusChart scope={scope} />,
    tasksStatus: <TaskStatusChart scope={scope} />,
    tasksByPriority: <TaskPriorityChart scope={scope} />,
    taskTrend: <TaskTrendChart scope={scope} />,
    developerWorkload: <DeveloperWorkloadChart scope={scope} />,
    overdueList: <OverdueList scope={scope} />,
    slaCompliance: <SlaComplianceChart scope={scope} />,
    velocityTrend: <VelocityTrendChart scope={scope} />,
    activeSprintsHealth: <ActiveSprintsHealthList scope={scope} />,
    myOpenIssues: <MyOpenIssuesList scope={scope} />,
    resolutionTimeTrend: <ResolutionTimeTrendChart scope={scope} />,
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const scope = { projectId: projectId ?? undefined }
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(scope)
  const { data: projectsData } = useProjects({ page: 1, limit: 100 })
  const { data: preferences } = useDashboardPreferences()

  const canSeeWorkload = can('dashboard:viewOrgWide')

  // The permission gate always runs first - a stored preference can only hide/reorder what the
  // viewer's role already permits, never surface Manager-only data to a Developer.
  const availableWidgetIds = DASHBOARD_WIDGET_IDS.filter(
    (id) => id !== 'developerWorkload' || canSeeWorkload,
  )
  const storedOrder = (preferences?.widgetOrder ?? []).filter((id) =>
    availableWidgetIds.includes(id),
  )
  const effectiveOrder = [
    ...storedOrder,
    ...availableWidgetIds.filter((id) => !storedOrder.includes(id)),
  ]
  const hiddenSet = new Set(preferences?.hiddenWidgets ?? [])
  const visibleOrder = effectiveOrder.filter((id) => !hiddenSet.has(id))
  const registry = widgetRegistry(scope)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={user ? HEADING_BY_ROLE[user.role] : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={projectId ?? ALL_PROJECTS}
              onValueChange={(v) => setProjectId(v === ALL_PROJECTS ? null : v)}
            >
              <SelectTrigger className="w-56" aria-label="Filter dashboard by project">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {projectsData?.data.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setCustomizeOpen(true)}
            >
              <Settings2 className="h-4 w-4" /> Customize
            </Button>
          </div>
        }
      />

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Total projects"
            value={summary?.totalProjects ?? 0}
            icon={FolderKanban}
            isLoading={summaryLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Open tasks"
            value={summary?.openTasks ?? 0}
            icon={ListTodo}
            isLoading={summaryLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Completed tasks"
            value={summary?.completedTasks ?? 0}
            icon={CheckCircle2}
            isLoading={summaryLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Completion rate"
            value={`${summary?.completionRate ?? 0}%`}
            icon={TrendingUp}
            isLoading={summaryLoading}
          />
        </StaggerItem>
      </StaggerContainer>

      <StaggerContainer className="grid gap-4 lg:grid-cols-2">
        {visibleOrder.map((id) => (
          <StaggerItem key={id}>{registry[id]}</StaggerItem>
        ))}
      </StaggerContainer>

      <DashboardCustomizeForm
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        availableWidgets={availableWidgetIds.map((id) => ({ id, label: WIDGET_LABELS[id] }))}
        order={effectiveOrder}
        hidden={[...hiddenSet].filter((id): id is DashboardWidgetId =>
          availableWidgetIds.includes(id as DashboardWidgetId),
        )}
      />
    </div>
  )
}
