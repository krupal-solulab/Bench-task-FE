import { useState } from 'react'
import { CheckCircle2, FolderKanban, ListTodo, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProjectStatusChart } from '@/components/dashboard/ProjectStatusChart'
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart'
import { TaskPriorityChart } from '@/components/dashboard/TaskPriorityChart'
import { DeveloperWorkloadChart } from '@/components/dashboard/DeveloperWorkloadChart'
import { TaskTrendChart } from '@/components/dashboard/TaskTrendChart'
import { OverdueList } from '@/components/dashboard/OverdueList'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardSummary } from '@/hooks/queries/useDashboard'
import { useProjects } from '@/hooks/queries/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const ALL_PROJECTS = '__all__'

const HEADING_BY_ROLE: Record<string, string> = {
  Admin: 'Organization overview',
  Manager: 'Your projects',
  Developer: 'Your tasks',
}

export function DashboardPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const [projectId, setProjectId] = useState<string | null>(null)

  const scope = { projectId: projectId ?? undefined }
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(scope)
  const { data: projectsData } = useProjects({ page: 1, limit: 100 })

  const canSeeWorkload = can('dashboard:viewOrgWide')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={user ? HEADING_BY_ROLE[user.role] : undefined}
        actions={
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
        <StaggerItem>
          <ProjectStatusChart scope={scope} />
        </StaggerItem>
        <StaggerItem>
          <TaskStatusChart scope={scope} />
        </StaggerItem>
        <StaggerItem>
          <TaskPriorityChart scope={scope} />
        </StaggerItem>
        <StaggerItem>
          <TaskTrendChart scope={scope} />
        </StaggerItem>
        {canSeeWorkload && (
          <StaggerItem>
            <DeveloperWorkloadChart scope={scope} />
          </StaggerItem>
        )}
        <StaggerItem>
          <OverdueList scope={scope} />
        </StaggerItem>
      </StaggerContainer>
    </div>
  )
}
