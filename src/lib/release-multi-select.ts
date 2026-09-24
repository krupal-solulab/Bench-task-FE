/** Pure toggle logic for ReleaseMultiSelect, split into its own module (mirrors
 * workflow-automation-badge.ts's split from WorkflowCanvas) so it's directly unit-testable
 * without driving the Radix Checkbox/Popover combo under jsdom - see ReleaseMultiSelect.test.tsx. */
export function toggleReleaseSelection(value: string[], releaseId: string): string[] {
  return value.includes(releaseId) ? value.filter((v) => v !== releaseId) : [...value, releaseId]
}
