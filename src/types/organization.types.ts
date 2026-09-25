export const ORGANIZATION_STATUSES = ['Active', 'Suspended'] as const
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export interface Organization {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationAdmin {
  id: string
  name: string
  email: string
  isActive: boolean
}

export interface OrganizationDetail extends Organization {
  admins: OrganizationAdmin[]
}

export interface OrganizationListQuery {
  page?: number
  limit?: number
  search?: string
  status?: OrganizationStatus
  sortBy?: 'name' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateOrganizationPayload {
  organizationName: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface AddOrganizationAdminPayload {
  name: string
  email: string
  password: string
}

export interface PlatformStats {
  organizationCount: number
  totalUserCount: number
}

/** Module 8's self-service org settings (`GET/PATCH organizations/me`) - distinct from the
 * PlatformAdmin-only `Organization` above (which covers any org, by id, rename+status only). */
export interface OrganizationSettings {
  id: string
  name: string
  timezone: string
  logoUrl: string | null
}

export interface UpdateOrganizationSettingsPayload {
  name?: string
  timezone?: string
  logoUrl?: string | null
}
