import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { roadmapService } from '@/services/roadmap.service'
import type { RoadmapQuery } from '@/types/issue-link.types'

export function useDependencyGraph(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.planning.dependencyGraph(projectId ?? ''),
    queryFn: () => roadmapService.dependencyGraph(projectId!),
    enabled: !!projectId,
  })
}

export function useRoadmap(query: RoadmapQuery) {
  return useQuery({
    queryKey: queryKeys.planning.roadmap(query),
    queryFn: () => roadmapService.get(query),
    placeholderData: (prev) => prev,
  })
}
