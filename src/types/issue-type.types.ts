export const ISSUE_TYPE_LEVELS = ['epic', 'standard', 'subtask'] as const
export type IssueTypeLevel = (typeof ISSUE_TYPE_LEVELS)[number]

export const ISSUE_TYPE_ICONS = [
  'Zap',
  'Bookmark',
  'CheckSquare',
  'Bug',
  'ListChecks',
  'Flag',
  'Star',
  'AlertCircle',
  'Layers',
  'Wrench',
] as const
export type IssueTypeIcon = (typeof ISSUE_TYPE_ICONS)[number]

export const ISSUE_TYPE_COLORS = [
  'slate',
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'cyan',
] as const
export type IssueTypeColorKey = (typeof ISSUE_TYPE_COLORS)[number]

export interface IssueTypeDefinition {
  name: string
  level: IssueTypeLevel
  icon: IssueTypeIcon
  color: IssueTypeColorKey
}

/** The 5 built-in issue types with their levels and default icon/color - byte-for-byte the
 * backend's DEFAULT_ISSUE_TYPES (issue-type.schema.ts), used as the fallback everywhere a
 * project's own `issueTypes` array is empty (i.e. hasn't been customized). */
export const DEFAULT_ISSUE_TYPES: IssueTypeDefinition[] = [
  { name: 'Epic', level: 'epic', icon: 'Zap', color: 'purple' },
  { name: 'Story', level: 'standard', icon: 'Bookmark', color: 'green' },
  { name: 'Task', level: 'standard', icon: 'CheckSquare', color: 'blue' },
  { name: 'Bug', level: 'standard', icon: 'Bug', color: 'red' },
  { name: 'Sub-task', level: 'subtask', icon: 'ListChecks', color: 'slate' },
]

export interface IssueTypesCarrier {
  issueTypes?: IssueTypeDefinition[]
}

/** A project's effective issue types - its own custom set, or the system defaults when unset -
 * mirrors the backend's resolveIssueTypes() exactly. */
export function resolveIssueTypes(project: IssueTypesCarrier): IssueTypeDefinition[] {
  return project.issueTypes && project.issueTypes.length > 0
    ? project.issueTypes
    : DEFAULT_ISSUE_TYPES
}

export function standardIssueTypeNames(project: IssueTypesCarrier): string[] {
  return resolveIssueTypes(project)
    .filter((t) => t.level === 'standard')
    .map((t) => t.name)
}
