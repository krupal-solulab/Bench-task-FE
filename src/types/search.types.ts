export interface GlobalSearchQuery {
  q: string
  limit?: number
}

export interface GlobalSearchTaskResult {
  id: string
  issueKey: string | null
  title: string
  project: { id: string; name: string } | null
  status: string
  statusCategory: string
}

export interface GlobalSearchProjectResult {
  id: string
  name: string
  status: string
}

export interface GlobalSearchUserResult {
  id: string
  name: string
  email: string
}

export interface GlobalSearchResult {
  tasks: GlobalSearchTaskResult[]
  projects: GlobalSearchProjectResult[]
  users: GlobalSearchUserResult[]
}
