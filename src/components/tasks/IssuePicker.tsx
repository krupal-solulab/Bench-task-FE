import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/common/Spinner'
import { useProjectTasks } from '@/hooks/queries/useProjects'
import type { IssueType } from '@/types/task.types'

export interface IssuePickerProps {
  projectId: string
  issueTypes: IssueType[]
  value: string | null
  onChange: (taskId: string | null) => void
  /** Exclude the issue being edited from its own picker (an issue can't be its own parent). */
  excludeId?: string
  placeholder?: string
  id?: string
  allowClear?: boolean
}

const NONE_VALUE = '__none__'

/** A searchable picker over one project's issues, scoped to specific issue types - used for the
 * Sub-task "parent" field and the Story/Task/Bug "epic" field on TaskForm. */
export function IssuePicker({
  projectId,
  issueTypes,
  value,
  onChange,
  excludeId,
  placeholder = 'Select an issue',
  id,
  allowClear = true,
}: IssuePickerProps) {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useProjectTasks(projectId, {
    page: 1,
    limit: 100,
    issueType: issueTypes,
  })

  const options = useMemo(() => {
    const pool = (data?.data ?? []).filter((t) => t.id !== excludeId)
    if (!search.trim()) return pool
    const term = search.trim().toLowerCase()
    return pool.filter(
      (t) =>
        t.title.toLowerCase().includes(term) || (t.issueKey?.toLowerCase().includes(term) ?? false),
    )
  }, [data, excludeId, search])

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
        <Spinner /> Loading issues…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-10 items-center rounded-md border border-destructive/30 px-3 text-sm text-destructive">
        Failed to load issues
      </div>
    )
  }

  const selectValue = value ?? (allowClear ? NONE_VALUE : undefined)

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === NONE_VALUE ? null : next)}
    >
      <SelectTrigger id={id} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or key…"
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {allowClear && <SelectItem value={NONE_VALUE}>None</SelectItem>}
        {options.map((task) => (
          <SelectItem key={task.id} value={task.id}>
            {task.issueKey ? `${task.issueKey} · ` : ''}
            {task.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
