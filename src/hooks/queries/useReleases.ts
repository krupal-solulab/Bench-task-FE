import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { releasesService } from '@/services/releases.service'
import type { ReleaseListQuery } from '@/types/release.types'

export function useReleases(projectId: string | undefined, query: ReleaseListQuery) {
  return useQuery({
    queryKey: queryKeys.releases.list(projectId ?? '', query),
    queryFn: () => releasesService.list(projectId!, query),
    enabled: !!projectId,
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useRelease(projectId: string | undefined, releaseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.releases.detail(releaseId ?? ''),
    queryFn: () => releasesService.get(projectId!, releaseId!),
    enabled: !!projectId && !!releaseId,
  })
}

export function useReleaseProgress(projectId: string | undefined, releaseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.releases.progress(releaseId ?? ''),
    queryFn: () => releasesService.progress(projectId!, releaseId!),
    enabled: !!projectId && !!releaseId,
  })
}

/** Disabled until explicitly requested (opening the release notes view) - composing notes is
 * cheap but there's no reason to fetch it for every release row up front. */
export function useReleaseNotes(
  projectId: string | undefined,
  releaseId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.releases.notes(releaseId ?? ''),
    queryFn: () => releasesService.releaseNotes(projectId!, releaseId!),
    enabled: !!projectId && !!releaseId && (options.enabled ?? true),
  })
}
