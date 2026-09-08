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
