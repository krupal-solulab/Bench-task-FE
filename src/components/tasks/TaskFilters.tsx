import { FilterBar } from '@/components/common/FilterBar'
import { SearchInput } from '@/components/common/SearchInput'
import { UserSelect } from '@/components/common/UserSelect'
import { DatePicker } from '@/components/common/DatePicker'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TASK_PRIORITIES, TASK_STATUSES, type TaskListQuery } from '@/types/task.types'

export interface TaskFiltersProps {
  value: TaskListQuery
  onChange: (value: Partial<TaskListQuery>) => void
  onClear: () => void
  hideAssignee?: boolean
}

const ALL = '__all__'

export function TaskFilters({ value, onChange, onClear, hideAssignee }: TaskFiltersProps) {
  const hasActiveFilters = !!(
    value.search ||
    value.status ||
    value.priority ||
    value.assignee ||
    value.dueDateFrom ||
    value.dueDateTo ||
    value.overdue
  )

  return (
    <FilterBar onClear={onClear} hasActiveFilters={hasActiveFilters}>
      <SearchInput
        value={value.search ?? ''}
        onChange={(search) => onChange({ search: search || undefined })}
        placeholder="Search tasks…"
        className="w-56"
      />

      <Select
        value={value.status ?? ALL}
        onValueChange={(v) =>
          onChange({ status: v === ALL ? undefined : (v as TaskListQuery['status']) })
        }
      >
        <SelectTrigger className="w-36" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.priority ?? ALL}
        onValueChange={(v) =>
          onChange({ priority: v === ALL ? undefined : (v as TaskListQuery['priority']) })
        }
      >
        <SelectTrigger className="w-32" aria-label="Filter by priority">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hideAssignee && (
        <div className="w-48">
          <UserSelect
            value={value.assignee ?? null}
            onChange={(assignee) => onChange({ assignee: assignee ?? undefined })}
            placeholder="Assignee"
          />
        </div>
      )}

      <div className="flex items-center gap-1">
        <DatePicker
          value={value.dueDateFrom ?? null}
          onChange={(v) => onChange({ dueDateFrom: v ?? undefined })}
          label="Due from"
          className="w-36"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <DatePicker
          value={value.dueDateTo ?? null}
          onChange={(v) => onChange({ dueDateTo: v ?? undefined })}
          label="Due to"
          className="w-36"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.overdue}
          onCheckedChange={(checked) => onChange({ overdue: checked === true ? true : undefined })}
        />
        Overdue only
      </label>
    </FilterBar>
  )
}
