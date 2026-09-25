import { z } from 'zod'

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number')

export const createOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(120, 'Organization name is too long'),
  adminName: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  adminEmail: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  adminPassword: passwordRule,
})

export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>

export const addOrganizationAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: passwordRule,
})

export type AddOrganizationAdminFormValues = z.infer<typeof addOrganizationAdminSchema>

export const organizationSettingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  timezone: z.string().min(1, 'Timezone is required').max(60, 'Timezone is too long'),
  // '' represents "no logo" in the form; the page maps it to `null` before submitting.
  logoUrl: z.union([z.string().url('Enter a valid URL'), z.literal('')]),
})

export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsSchema>
