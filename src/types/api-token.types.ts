/** Module 11 gap-closure - personal API tokens. The secret is only ever returned on create. */
export interface ApiToken {
  id: string
  name: string
  prefix: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
  owner: string | { id?: string; _id?: string; name: string; email: string }
}

export type ApiTokenExpiryDays = 30 | 90 | 365 | null

export interface CreateApiTokenPayload {
  name: string
  expiresInDays: ApiTokenExpiryDays
}

export interface CreatedApiToken {
  token: string
  apiToken: ApiToken
}
