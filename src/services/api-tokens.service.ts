import { apiDelete, apiGet, apiPost } from './api-client'
import type { ApiToken, CreateApiTokenPayload, CreatedApiToken } from '@/types/api-token.types'

/** Module 11 gap-closure - personal API tokens. */
export const apiTokensService = {
  listMine: () => apiGet<ApiToken[]>('/api-tokens'),

  create: (payload: CreateApiTokenPayload) => apiPost<CreatedApiToken>('/api-tokens', payload),

  revoke: (id: string) => apiDelete<ApiToken>(`/api-tokens/${id}`),

  listOrg: () => apiGet<ApiToken[]>('/api-tokens/org'),

  revokeAny: (id: string) => apiDelete<ApiToken>(`/api-tokens/org/${id}`),
}
