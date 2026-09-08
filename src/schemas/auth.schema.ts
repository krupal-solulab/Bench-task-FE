import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number')

export const registerOrganizationSchema = z
  .object({
    organizationName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(120, 'Organization name is too long'),
    adminName: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
    adminEmail: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    adminPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterOrganizationFormValues = z.infer<typeof registerOrganizationSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRule,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
