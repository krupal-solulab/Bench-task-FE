import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useReleases } from '@/hooks/queries/useReleases'
import { toggleReleaseSelection } from '@/lib/release-multi-select'

export interface ReleaseMultiSelectProps {
  projectId: string
  value: string[]
  onChange: (releaseIds: string[]) => void
  placeholder?: string
  id?: string
}

/**
 * A true id-based multi-select for Module 2's Fix Version/Affects Version pickers - unlike
 * TagInput (used for Components/labels/MultiSelect custom fields), a release is a real entity
 * with its own lifecycle, so its id must be selected directly rather than matched by name.
 */
export function ReleaseMultiSelect({
  projectId,
  value,
  onChange,
  placeholder = 'Select releases',
  id,
}: ReleaseMultiSelectProps) {
  const { data, isLoading } = useReleases(projectId, { page: 1, limit: 100, sortOrder: 'asc' })
  const releases = data?.data ?? []
  const selectedNames = releases.filter((r) => value.includes(r.id)).map((r) => r.name)

  function toggle(releaseId: string) {
    onChange(toggleReleaseSelection(value, releaseId))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={isLoading}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <span className="truncate text-left">
            {selectedNames.length > 0 ? selectedNames.join(', ') : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 overflow-y-auto p-2">
        {releases.length === 0 ? (
          <p className="p-1 text-sm text-muted-foreground">No releases in this project yet.</p>
        ) : (
          <ul className="space-y-1">
            {releases.map((release) => (
              <li key={release.id}>
                <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox
                    checked={value.includes(release.id)}
                    onCheckedChange={() => toggle(release.id)}
                  />
                  {release.name}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {release.status}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
