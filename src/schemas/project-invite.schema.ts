import { z } from 'zod'
import { PROJECT_MEMBER_ROLES } from '@/types/user.types'

export const projectInviteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(PROJECT_MEMBER_ROLES),
})

export type ProjectInviteFormValues = z.infer<typeof projectInviteSchema>
