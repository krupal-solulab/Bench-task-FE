import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateReleasePayload,
  Release,
  ReleaseCompareResult,
  ReleaseListQuery,
  ReleaseNotes,
  ReleaseForecastRow,
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

  unarchive: (projectId: string, releaseId: string) =>
    apiPost<Release>(`/projects/${projectId}/releases/${releaseId}/unarchive`, {}),

  remove: (projectId: string, releaseId: string) =>
    apiDelete<void>(`/projects/${projectId}/releases/${releaseId}`),

  progress: (projectId: string, releaseId: string) =>
    apiGet<ReleaseProgress>(`/projects/${projectId}/releases/${releaseId}/progress`),

  forecast: (projectId: string) =>
    apiGet<ReleaseForecastRow[]>(`/projects/${projectId}/releases/forecast`),

  releaseNotes: (projectId: string, releaseId: string) =>
    apiGet<ReleaseNotes>(`/projects/${projectId}/releases/${releaseId}/release-notes`),

  compare: (projectId: string, a: string, b: string) =>
    apiGet<ReleaseCompareResult>(`/projects/${projectId}/releases/compare`, { a, b }),
}
