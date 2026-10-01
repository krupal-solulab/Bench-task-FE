/** Module 8 gap-closure - an org-wide project category (Admin-managed). */
export interface ProjectCategory {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface ProjectCategoryPayload {
  name: string
  description?: string
}
