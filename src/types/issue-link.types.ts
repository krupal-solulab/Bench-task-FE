import type { StatusCategory } from './workflow.types'

export interface LinkType {
  id: string
  name: string
  inverseName: string
  isBlocking: boolean
}

/** Omit `id` when creating a new type - the server assigns one. */
export type LinkTypeDraft = Partial<Pick<LinkType, 'id'>> & Omit<LinkType, 'id'>

export interface IssueLinkTaskSummary {
  id: string
  issueKey: string | null
  title: string
  status: string
  statusCategory: StatusCategory
  project: { id: string; name: string }
}

export interface IssueLink {
  id: string
  linkTypeId: string
  linkTypeName: string
  direction: 'outgoing' | 'incoming'
  task: IssueLinkTaskSummary
}

export interface CreateIssueLinkPayload {
  targetTaskId: string
  linkTypeId: string
}

export interface DependencyGraphNode {
  id: string
  issueKey: string | null
  title: string
  status: string
  statusCategory: StatusCategory
  issueType: string
  external: boolean
  projectName?: string
}

export interface DependencyGraphEdge {
  id: string
  source: string
  target: string
  linkTypeId: string
  linkTypeName: string
  isBlocking: boolean
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[]
  edges: DependencyGraphEdge[]
}

export interface RoadmapQuery {
  projectIds?: string[]
  status?: StatusCategory
}

export interface RoadmapEpic {
  epicId: string
  issueKey: string | null
  title: string
  statusCategory: StatusCategory
  dueDate: string | null
  createdAt: string
  project: { id: string; name: string }
  linkedIssueCount: number
  doneCount: number
  progress: number
  blockedByExternal: Array<{
    epicId: string
    issueKey: string | null
    title: string
    projectName: string
  }>
}

export interface RoadmapProjectCapacity {
  projectId: string
  activeSprintId: string | null
  capacityPoints: number | null
  committedPoints: number
}

export interface RoadmapData {
  projects: Array<{ id: string; name: string }>
  epics: RoadmapEpic[]
  capacity: RoadmapProjectCapacity[]
}
