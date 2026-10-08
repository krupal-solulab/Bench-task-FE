import { z } from 'zod'

export const projectInviteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  /** A RoleChoice: Developer / Manager, or custom:<id> - see lib/roles. */
  role: z.string().min(1, 'Choose a role'),
})

export type ProjectInviteFormValues = z.infer<typeof projectInviteSchema>
