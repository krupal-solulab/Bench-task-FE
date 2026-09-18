export const SAVED_FILTER_SCOPES = ['project', 'myTasks'] as const
export type SavedFilterScope = (typeof SAVED_FILTER_SCOPES)[number]

// Search/Dashboards v2 - only ever SHARED for a 'project'-scoped filter (a 'myTasks' filter has
// no natural audience to share with and stays personal by definition).
export const SAVED_FILTER_VISIBILITIES = ['private', 'shared'] as const
export type SavedFilterVisibility = (typeof SAVED_FILTER_VISIBILITIES)[number]

export interface SavedFilter {
  id: string
  name: string
  scope: SavedFilterScope
  projectId: string | null
  visibility: SavedFilterVisibility
  owner: string
  query: Record<string, unknown>
  createdAt: string
}

export interface CreateSavedFilterPayload {
  name: string
  scope: SavedFilterScope
  projectId?: string
  visibility?: SavedFilterVisibility
  query: Record<string, unknown>
}

export interface ListSavedFiltersQuery {
  scope?: SavedFilterScope
  projectId?: string
}
