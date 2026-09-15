export const SAVED_FILTER_SCOPES = ['project', 'myTasks'] as const
export type SavedFilterScope = (typeof SAVED_FILTER_SCOPES)[number]

export interface SavedFilter {
  id: string
  name: string
  scope: SavedFilterScope
  projectId: string | null
  query: Record<string, unknown>
  createdAt: string
}

export interface CreateSavedFilterPayload {
  name: string
  scope: SavedFilterScope
  projectId?: string
  query: Record<string, unknown>
}

export interface ListSavedFiltersQuery {
  scope?: SavedFilterScope
  projectId?: string
}
