import { z } from 'zod'
import { ORG_ROLES } from '@/types/user.types'

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
  role: z.enum(ORG_ROLES),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>
