/** Module 12 gap-closure - display names for the field-level audit trail's built-in field ids
 * (the backend's BUILT_IN_TASK_FIELD_IDS). Custom fields are named from the project's own
 * definitions, passed in by the caller. */
export const BUILT_IN_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  dueDate: 'Due date',
  labels: 'Labels',
  components: 'Components',
  fixVersions: 'Fix versions',
  affectsVersions: 'Affects versions',
  storyPoints: 'Story points',
  originalEstimateHours: 'Original estimate (hours)',
  securityLevel: 'Security level',
}

export function fieldLabel(fieldId: string, customFieldNames: Record<string, string> = {}): string {
  return BUILT_IN_FIELD_LABELS[fieldId] ?? customFieldNames[fieldId] ?? 'a custom field'
}

/** "changed Labels: api → api, backend" - or just "changed Description" for long text, and no
 * values at all when the viewer isn't allowed to see the field. */
export function describeFieldChange(
  entry: { field?: string | null; from: string | null; to: string | null; redacted?: boolean },
  customFieldNames: Record<string, string> = {},
): string {
  const label = fieldLabel(entry.field ?? '', customFieldNames)
  if (entry.redacted || entry.field === 'description') return `changed ${label}`
  const from = entry.from ?? 'none'
  const to = entry.to ?? 'none'
  return `changed ${label}: ${from} → ${to}`
}
