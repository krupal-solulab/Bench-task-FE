import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { Spinner } from './Spinner'

export interface UserSelectProps {
  value: string | null
  onChange: (userId: string | null) => void
  /** Restrict the pool to these user ids (typically the current project's members). */
  memberIds?: string[]
  placeholder?: string
  id?: string
  allowUnassigned?: boolean
  /** Read-only (e.g. a field-permission rule) - shows the value but can't be changed. */
  disabled?: boolean
  /** Leave these people out - e.g. those already in the list this picker adds to. */
  excludeIds?: string[]
  /** Shown when nobody is left to pick (everyone is excluded or out of scope). */
  emptyText?: string
}

const UNASSIGNED_VALUE = '__unassigned__'

export function UserSelect({
  value,
  onChange,
  memberIds,
  placeholder = 'Select assignee',
  id,
  allowUnassigned = true,
  disabled = false,
  excludeIds,
  emptyText = 'No users found',
}: UserSelectProps) {
  const { data, isLoading, isError } = useAssignableUsers()
  const [search, setSearch] = useState('')

  const options = useMemo(() => {
    const pool = data?.data ?? []
    const inScope = memberIds ? pool.filter((u) => memberIds.includes(u.id)) : pool
    const excluded = new Set(excludeIds ?? [])
    const scoped = excluded.size > 0 ? inScope.filter((u) => !excluded.has(u.id)) : inScope
    if (!search.trim()) return scoped
    const term = search.trim().toLowerCase()
    return scoped.filter(
      (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    )
  }, [data, memberIds, excludeIds, search])

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
        <Spinner /> Loading users…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-10 items-center rounded-md border border-destructive/30 px-3 text-sm text-destructive">
        Failed to load users
      </div>
    )
  }

  // Only fall back to the "Unassigned" sentinel when that item actually renders — otherwise
  // Radix can't resolve a label for it and the trigger shows blank instead of the placeholder.
  // An empty string (not undefined) keeps the Select controlled: as an "add someone" picker
  // (value always null) it then shows its placeholder again after each pick instead of a blank.
  const selectValue = value ?? (allowUnassigned ? UNASSIGNED_VALUE : '')

  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(next) => onChange(next === UNASSIGNED_VALUE ? null : next)}
    >
      <SelectTrigger id={id} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {allowUnassigned && <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>}
        {options.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            {search.trim() ? 'No users match your search' : emptyText}
          </p>
        )}
        {options.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name} · {user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
