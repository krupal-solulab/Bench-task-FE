import { z } from 'zod'

export const sprintSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name is too long'),
    goal: z.string().max(1000, 'Goal is too long').optional().default(''),
    startDate: z.string().min(1, 'Start date is required'),
    // Exactly one of these two is ever sent - see SprintForm's duration-preset-vs-custom-range
    // toggle, which is local UI state, not part of this schema.
    endDate: z.string().optional(),
    durationWeeks: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    capacityPoints: z.number().min(0, 'Capacity cannot be negative').optional(),
  })
  .refine((data) => !!data.endDate || !!data.durationWeeks, {
    message: 'End date is required for a custom range',
    path: ['endDate'],
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  })

export type SprintFormValues = z.infer<typeof sprintSchema>
