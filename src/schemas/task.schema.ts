import { z } from 'zod'
import { TASK_PRIORITIES } from '@/types/task.types'

export const taskSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
    description: z.string().max(5000, 'Description is too long').optional().default(''),
    project: z.string().min(1, 'Project is required'),
    assignee: z.string().nullable().optional(),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z.string().nullable().optional(),
    // One of the project's enabled issue types - the 5 built-ins, or a custom Standard-level type
    // (see issue-type.types.ts) - so this is a free-form string, validated by the server against
    // the project's actual configuration, not a fixed enum here.
    issueType: z.string().min(1).optional().default('Task'),
    parent: z.string().nullable().optional(),
    storyPoints: z.number().min(0).max(1000).nullable().optional(),
    originalEstimateHours: z.number().min(0).max(10000).nullable().optional(),
    labels: z.array(z.string()).optional().default([]),
    components: z.array(z.string()).optional().default([]),
    fixVersions: z.array(z.string()).optional().default([]),
    affectsVersions: z.array(z.string()).optional().default([]),
    // Required-field enforcement for custom fields happens server-side - the project's field
    // definitions aren't known to this static schema.
    customFieldValues: z.record(z.unknown()).optional().default({}),
    // Module 6 - a level name from the project's assigned Security Scheme, validated server-side
    // against that scheme's actual levels (not known to this static schema).
    securityLevel: z.string().nullable().optional(),
  })
  .refine((data) => data.issueType !== 'Sub-task' || !!data.parent, {
    message: 'A Sub-task requires a parent issue',
    path: ['parent'],
  })

export type TaskFormValues = z.infer<typeof taskSchema>
