import { apiGet } from './api-client'
import type { DependencyGraph, RoadmapData, RoadmapQuery } from '@/types/issue-link.types'

export const roadmapService = {
  dependencyGraph: (projectId: string) =>
    apiGet<DependencyGraph>(`/projects/${projectId}/dependency-graph`),

  get: (query: RoadmapQuery) => apiGet<RoadmapData>('/projects/reports/roadmap', query),
}
