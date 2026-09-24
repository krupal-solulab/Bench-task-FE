import { z } from 'zod'

export const workLogSchema = z.object({
  hours: z.number().min(0.1, 'Must be at least 0.1 hours').max(24, 'Cannot exceed 24 hours'),
  description: z.string().max(2000, 'Description is too long').optional().default(''),
  workDate: z.string().min(1, 'Date is required'),
  billable: z.boolean().optional().default(true),
})

export type WorkLogFormValues = z.infer<typeof workLogSchema>
