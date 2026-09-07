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
}

const UNASSIGNED_VALUE = '__unassigned__'

export function UserSelect({
  value,
  onChange,
  memberIds,
  placeholder = 'Select assignee',
  id,
  allowUnassigned = true,
}: UserSelectProps) {
  const { data, isLoading, isError } = useAssignableUsers()
  const [search, setSearch] = useState('')

  const options = useMemo(() => {
    const pool = data?.data ?? []
    const scoped = memberIds ? pool.filter((u) => memberIds.includes(u.id)) : pool
    if (!search.trim()) return scoped
    const term = search.trim().toLowerCase()
    return scoped.filter(
      (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    )
  }, [data, memberIds, search])

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
  const selectValue = value ?? (allowUnassigned ? UNASSIGNED_VALUE : undefined)

  return (
    <Select
      value={selectValue}
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
        {options.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name} · {user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
