import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateReleasePayload,
  Release,
  ReleaseListQuery,
  ReleaseNotes,
  ReleaseProgress,
  UpdateReleasePayload,
} from '@/types/release.types'

export const releasesService = {
  list: (projectId: string, query: ReleaseListQuery) =>
    apiGetPaginated<Release>(`/projects/${projectId}/releases`, query),

  get: (projectId: string, releaseId: string) =>
    apiGet<Release>(`/projects/${projectId}/releases/${releaseId}`),

  create: (projectId: string, payload: CreateReleasePayload) =>
    apiPost<Release>(`/projects/${projectId}/releases`, payload),

  update: (projectId: string, releaseId: string, payload: UpdateReleasePayload) =>
    apiPatch<Release>(`/projects/${projectId}/releases/${releaseId}`, payload),

  release: (projectId: string, releaseId: string) =>
    apiPost<Release>(`/projects/${projectId}/releases/${releaseId}/release`, {}),

  unrelease: (projectId: string, releaseId: string) =>
    apiPost<Release>(`/projects/${projectId}/releases/${releaseId}/unrelease`, {}),

  archive: (projectId: string, releaseId: string) =>
    apiPost<Release>(`/projects/${projectId}/releases/${releaseId}/archive`, {}),

  remove: (projectId: string, releaseId: string) =>
    apiDelete<void>(`/projects/${projectId}/releases/${releaseId}`),

  progress: (projectId: string, releaseId: string) =>
    apiGet<ReleaseProgress>(`/projects/${projectId}/releases/${releaseId}/progress`),

  releaseNotes: (projectId: string, releaseId: string) =>
    apiGet<ReleaseNotes>(`/projects/${projectId}/releases/${releaseId}/release-notes`),
}
