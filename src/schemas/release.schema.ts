import { z } from 'zod'

export const releaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(2000, 'Description is too long').optional().default(''),
  releaseDate: z.string().optional(),
})

export type ReleaseFormValues = z.infer<typeof releaseSchema>
