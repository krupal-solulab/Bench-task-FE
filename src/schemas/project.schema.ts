import { z } from 'zod'

export const projectSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(120, 'Name is too long'),
    description: z.string().max(2000, 'Description is too long').optional().default(''),
    startDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    memberIds: z.array(z.string()).optional(),
  })
  .refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
    message: 'Due date must be on or after the start date',
    path: ['dueDate'],
  })

export type ProjectFormValues = z.infer<typeof projectSchema>
