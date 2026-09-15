import { z } from 'zod'
import { ISSUE_TYPES, TASK_PRIORITIES } from '@/types/task.types'

export const taskSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
    description: z.string().max(5000, 'Description is too long').optional().default(''),
    project: z.string().min(1, 'Project is required'),
    assignee: z.string().nullable().optional(),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z.string().nullable().optional(),
    issueType: z.enum(ISSUE_TYPES).optional().default('Task'),
    parent: z.string().nullable().optional(),
    storyPoints: z.number().min(0).max(1000).nullable().optional(),
    labels: z.array(z.string()).optional().default([]),
    components: z.array(z.string()).optional().default([]),
    // Required-field enforcement for custom fields happens server-side - the project's field
    // definitions aren't known to this static schema.
    customFieldValues: z.record(z.unknown()).optional().default({}),
  })
  .refine((data) => data.issueType !== 'Sub-task' || !!data.parent, {
    message: 'A Sub-task requires a parent issue',
    path: ['parent'],
  })

export type TaskFormValues = z.infer<typeof taskSchema>
