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

/** Module 11 gap-closure - a comment match (always on an issue the viewer can see). */
export interface GlobalSearchCommentResult {
  id: string
  snippet: string
  task: { id: string; issueKey: string | null; title: string }
  author: { id: string; name: string } | null
  createdAt: string
}

export interface GlobalSearchResult {
  tasks: GlobalSearchTaskResult[]
  /** Optional so mocks predating comment search stay valid. */
  comments?: GlobalSearchCommentResult[]
  projects: GlobalSearchProjectResult[]
  users: GlobalSearchUserResult[]
}
