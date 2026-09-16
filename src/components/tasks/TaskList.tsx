import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { Avatar } from '@/components/common/Avatar'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate } from '@/lib/date'
import type { SortOrder } from '@/types/api.types'
import type { Task, TaskListQuery } from '@/types/task.types'
import type { IssueTypeDefinition } from '@/types/issue-type.types'

export interface TaskListProps {
  tasks: Task[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  sortBy?: TaskListQuery['sortBy']
  sortOrder?: SortOrder
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  showProject?: boolean
  /** The owning project's resolved issue types, for icon/color - omitted for cross-project lists
   * (e.g. My Tasks), where IssueTypeBadge falls back to the built-in defaults. */
  issueTypeDefinitions?: IssueTypeDefinition[]
}

export function TaskList({
  tasks,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  sortBy,
  sortOrder,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  showProject,
  issueTypeDefinitions,
}: TaskListProps) {
  const navigate = useNavigate()

  const columns: DataTableColumn<Task>[] = [
    { key: 'title', header: 'Title', render: (t) => t.title },
    {
      key: 'issueType',
      header: 'Type',
      render: (t) => <IssueTypeBadge issueType={t.issueType} definitions={issueTypeDefinitions} />,
    },
    ...(showProject
      ? [
          {
            key: 'project',
            header: 'Project',
            render: (t: Task) => t.project.name,
          } as DataTableColumn<Task>,
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} kind="task" category={t.statusCategory} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (t) => (t.assignee ? <Avatar name={t.assignee.name} size="sm" /> : '—'),
    },
    {
      key: 'dueDate',
      header: 'Due date',
      sortable: true,
      render: (t) => (
        <span className="flex items-center gap-1">
          {formatDate(t.dueDate)}
          <OverdueBadge
            dueDate={t.dueDate}
            status={t.status}
            isDone={t.statusCategory === 'Done'}
          />
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={tasks}
      getRowKey={(t) => t.id}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      onRowClick={(t) => navigate(`/tasks/${t.id}`)}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No results for these filters' : 'No tasks yet'}
          description={
            hasActiveFilters ? 'Try a different search or clear your filters.' : undefined
          }
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      }
    />
  )
}
