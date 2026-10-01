import { FilterBar } from '@/components/common/FilterBar'
import { SearchInput } from '@/components/common/SearchInput'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROJECT_STATUSES, type ProjectStatus } from '@/types/project.types'
import { useProjectCategories } from '@/hooks/queries/useProjectCategories'

export interface ProjectFiltersValue {
  search: string
  status?: ProjectStatus
  owner?: string
  member?: string
  category?: string
  archived?: 'false' | 'true' | 'all'
}

export interface ProjectOwnerOption {
  id: string
  name: string
}

export interface ProjectFiltersProps {
  value: ProjectFiltersValue
  onChange: (value: Partial<ProjectFiltersValue>) => void
  onClear: () => void
  /** Owners of currently-accessible projects — there's no directory endpoint for Manager/Developer. */
  owners: ProjectOwnerOption[]
}

const ALL_STATUSES = '__all__'
const ALL_OWNERS = '__all__'
const ALL_CATEGORIES = '__all__'

export function ProjectFilters({ value, onChange, onClear, owners }: ProjectFiltersProps) {
  const { data: categories = [] } = useProjectCategories()
  const hasActiveFilters =
    !!value.search ||
    !!value.status ||
    !!value.owner ||
    !!value.member ||
    !!value.category ||
    !!value.archived

  return (
    <FilterBar onClear={onClear} hasActiveFilters={hasActiveFilters}>
      <SearchInput
        value={value.search}
        onChange={(search) => onChange({ search })}
        placeholder="Search projects…"
        className="w-64"
      />

      <Select
        value={value.status ?? ALL_STATUSES}
        onValueChange={(v) =>
          onChange({ status: v === ALL_STATUSES ? undefined : (v as ProjectStatus) })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
          {PROJECT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.owner ?? ALL_OWNERS}
        onValueChange={(v) => onChange({ owner: v === ALL_OWNERS ? undefined : v })}
      >
        <SelectTrigger className="w-44" aria-label="Filter by owner">
          <SelectValue placeholder="All owners" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OWNERS}>All owners</SelectItem>
          {owners.map((owner) => (
            <SelectItem key={owner.id} value={owner.id}>
              {owner.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {categories.length > 0 && (
        <Select
          value={value.category ?? ALL_CATEGORIES}
          onValueChange={(v) => onChange({ category: v === ALL_CATEGORIES ? undefined : v })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.archived ?? 'false'}
        onValueChange={(v) =>
          onChange({ archived: v === 'false' ? undefined : (v as 'true' | 'all') })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter by archived state">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">Active projects</SelectItem>
          <SelectItem value="true">Archived only</SelectItem>
          <SelectItem value="all">Active + archived</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-56">
        <UserSelect
          value={value.member ?? null}
          onChange={(member) => onChange({ member: member ?? undefined })}
          placeholder="Filter by member"
          allowUnassigned={false}
        />
      </div>
    </FilterBar>
  )
}
