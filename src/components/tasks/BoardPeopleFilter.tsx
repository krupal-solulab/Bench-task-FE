import { useState } from 'react'
import { UserX } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/cn'
import type { User } from '@/types/user.types'

/** The filter value standing for "tasks with no assignee". */
export const UNASSIGNED_FILTER = 'unassigned'

/** How many avatars show inline before the rest collapse into a "+N" menu. */
const INLINE_AVATARS = 6

/**
 * Jira-style people filter for the board: click avatars (and/or Unassigned) to show only those
 * people's issues - any combination, so anyone can look at anyone's work. Empty = everyone.
 */
export function BoardPeopleFilter({
  people,
  selected,
  onChange,
  currentUserId,
}: {
  people: Pick<User, 'id' | 'name'>[]
  selected: string[]
  onChange: (next: string[]) => void
  currentUserId?: string
}) {
  // The current user first (the most common filter), then everyone alphabetically.
  const ordered = [...people].sort((a, b) =>
    a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : a.name.localeCompare(b.name),
  )
  const inline = ordered.slice(0, INLINE_AVATARS)
  const overflow = ordered.slice(INLINE_AVATARS)
  const overflowSelected = overflow.filter((p) => selected.includes(p.id)).length

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  const label = (p: Pick<User, 'id' | 'name'>) =>
    p.id === currentUserId ? `${p.name} (you)` : p.name

  return (
    <div role="group" aria-label="Filter by people" className="flex items-center">
      <div className="flex items-center -space-x-1.5">
        {inline.map((person) => {
          const active = selected.includes(person.id)
          return (
            <button
              key={person.id}
              type="button"
              aria-pressed={active}
              aria-label={`Show ${label(person)}'s issues`}
              title={label(person)}
              onClick={() => toggle(person.id)}
              className={cn(
                'relative rounded-full ring-2 ring-card transition-transform hover:z-10 hover:-translate-y-0.5',
                'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-ring',
                active && 'z-10 ring-primary',
              )}
            >
              <Avatar name={person.name} size="md" />
            </button>
          )
        })}
        {overflow.length > 0 && (
          <OverflowPeople
            people={overflow}
            selected={selected}
            selectedCount={overflowSelected}
            onToggle={toggle}
            label={label}
          />
        )}
      </div>
      <button
        type="button"
        aria-pressed={selected.includes(UNASSIGNED_FILTER)}
        onClick={() => toggle(UNASSIGNED_FILTER)}
        className={cn(
          'ml-2 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected.includes(UNASSIGNED_FILTER)
            ? 'border-primary bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <UserX className="h-3.5 w-3.5" aria-hidden />
        Unassigned
      </button>
    </div>
  )
}

function OverflowPeople({
  people,
  selected,
  selectedCount,
  onToggle,
  label,
}: {
  people: Pick<User, 'id' | 'name'>[]
  selected: string[]
  selectedCount: number
  onToggle: (id: string) => void
  label: (p: Pick<User, 'id' | 'name'>) => string
}) {
  const [search, setSearch] = useState('')
  const matches = people.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${people.length} more people`}
        className={cn(
          'relative flex h-8 min-w-8 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium ring-2 ring-card',
          'hover:z-10 hover:bg-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-ring',
          selectedCount > 0 && 'z-10 bg-primary/10 text-primary ring-primary',
        )}
      >
        +{people.length}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <input
          aria-label="Search people"
          placeholder="Search people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {matches.map((person) => (
            <li key={person.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox
                  checked={selected.includes(person.id)}
                  onCheckedChange={() => onToggle(person.id)}
                />
                <Avatar name={person.name} size="sm" />
                <span className="truncate">{label(person)}</span>
              </label>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">No one found</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
