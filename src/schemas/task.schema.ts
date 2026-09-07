import { z } from 'zod'
import { TASK_PRIORITIES } from '@/types/task.types'

export const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional().default(''),
  project: z.string().min(1, 'Project is required'),
  assignee: z.string().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().nullable().optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
