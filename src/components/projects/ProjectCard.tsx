import { Link } from 'react-router-dom'
import { AvatarStack } from '@/components/common/Avatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { formatDate } from '@/lib/date'
import type { Project } from '@/types/project.types'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block space-y-3 rounded-xl border bg-card p-4 shadow-soft transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">
          {project.name}
        </h3>
        <StatusBadge status={project.status} kind="project" />
      </div>

      {project.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <AvatarStack names={project.members.map((m) => m.user.name)} />
        <span className="text-xs text-muted-foreground">{project.taskCount} tasks</span>
      </div>

      <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>Due {formatDate(project.dueDate)}</span>
        <OverdueBadge dueDate={project.dueDate} status={project.status} />
      </div>
    </Link>
  )
}
