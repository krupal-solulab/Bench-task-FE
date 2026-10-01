import type { CustomFieldType } from './project.types'

/** Module 8 gap-closure - an org-wide custom field definition any project can adopt; adopting
 * keeps this entry's `id` as the field id, so the field means the same thing in every project. */
export interface CustomFieldLibraryEntry {
  id: string
  name: string
  type: CustomFieldType
  options: string[] | null
  description: string
  /** How many (non-deleted) projects currently use this field. */
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateLibraryFieldPayload {
  name: string
  type: CustomFieldType
  options?: string[]
  description?: string
}

export type UpdateLibraryFieldPayload = Partial<Omit<CreateLibraryFieldPayload, 'type'>>
