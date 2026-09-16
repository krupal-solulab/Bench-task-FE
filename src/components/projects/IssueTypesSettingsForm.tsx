import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { Input } from '@/components/ui/input'
import { useUpdateIssueTypes } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import { ISSUE_TYPE_COLOR_CLASSES } from '@/lib/constants'
import { ISSUE_TYPE_ICON_COMPONENTS } from '@/lib/issue-type-icons'
import { resolveIssueTypes, ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS } from '@/types/issue-type.types'
import type { IssueTypeDefinition, IssueTypeIcon } from '@/types/issue-type.types'
import type { Project } from '@/types/project.types'

export interface IssueTypesSettingsFormProps {
  projectId: string
  project: Project
  canManage: boolean
}

/** A settings form for a project's issue types - mirrors FieldsSettingsForm's shape. Epic and
 * Sub-task rows are structurally fixed (exactly one of each, name locked) since the rest of the
 * app depends on those two exact names; only Standard-level rows (the BRD's "extensible" level)
 * can be freely added/renamed/removed. */
export function IssueTypesSettingsForm({
  projectId,
  project,
  canManage,
}: IssueTypesSettingsFormProps) {
  const [types, setTypes] = useState<IssueTypeDefinition[]>(resolveIssueTypes(project))
  const updateIssueTypes = useUpdateIssueTypes(projectId)
  const { showToast } = useToast()

  const validNames = types.map((t) => t.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const hasStandard = types.some((t) => t.level === 'standard')
  const canSave =
    canManage && !hasDuplicates && hasStandard && types.every((t) => t.name.trim().length > 0)

  function updateType(index: number, patch: Partial<IssueTypeDefinition>) {
    setTypes(types.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  function addType() {
    setTypes([...types, { name: '', level: 'standard', icon: 'Flag', color: 'slate' }])
  }

  function removeType(index: number) {
    setTypes(types.filter((_, i) => i !== index))
  }

  async function handleSave() {
    try {
      const saved = await updateIssueTypes.mutateAsync(types)
      setTypes(resolveIssueTypes(saved))
      showToast({ title: 'Issue types updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update issue types',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Issue types</h3>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <IssueTypeBadge key={t.name} issueType={t.name} definitions={types} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Issue types</h3>
        <Button type="button" size="sm" variant="outline" onClick={addType} className="gap-1">
          <Plus className="h-4 w-4" /> Add Standard type
        </Button>
      </div>

      <div className="space-y-3">
        {types.map((type, index) => {
          const isFixed = type.level === 'epic' || type.level === 'subtask'
          return (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Issue type ${index + 1} name`}
                  value={type.name}
                  onChange={(e) => updateType(index, { name: e.target.value })}
                  placeholder="Type name"
                  className="w-48"
                  disabled={isFixed}
                />
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {type.level}
                </span>
                <IssueTypeBadge issueType={type.name || '…'} definitions={[type]} />
                {!isFixed && (
                  <button
                    type="button"
                    onClick={() => removeType(index)}
                    aria-label={`Remove issue type ${type.name || index + 1}`}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-xs text-muted-foreground">Color</span>
                  {ISSUE_TYPE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateType(index, { color })}
                      aria-label={`${type.name || 'Type'} color ${color}`}
                      aria-pressed={type.color === color}
                      className={cn(
                        'h-5 w-5 rounded-full border-2 transition-transform',
                        ISSUE_TYPE_COLOR_CLASSES[color],
                        type.color === color ? 'scale-110 border-foreground' : 'border-transparent',
                      )}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs text-muted-foreground">Icon</span>
                  {ISSUE_TYPE_ICONS.map((icon) => (
                    <IconSwatch
                      key={icon}
                      icon={icon}
                      selected={type.icon === icon}
                      onClick={() => updateType(index, { icon })}
                      label={`${type.name || 'Type'} icon ${icon}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasDuplicates && (
        <p className="text-sm text-destructive">Issue type names must be unique.</p>
      )}
      {!hasStandard && (
        <p className="text-sm text-destructive">At least one Standard-level type is required.</p>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateIssueTypes.isPending}
          disabled={!canSave}
        >
          Save issue types
        </Button>
      </div>
    </div>
  )
}

function IconSwatch({
  icon,
  selected,
  onClick,
  label,
}: {
  icon: IssueTypeIcon
  selected: boolean
  onClick: () => void
  label: string
}) {
  const Icon = ISSUE_TYPE_ICON_COMPONENTS[icon]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md border',
        selected ? 'border-primary bg-primary/10' : 'border-input',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
