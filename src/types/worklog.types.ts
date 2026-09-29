import type { SortOrder } from './api.types'
import type { User } from './user.types'

export interface WorkLog {
  id: string
  task: string
  user: User
  hours: number
  description: string
  workDate: string
  billable: boolean
  createdAt: string
  updatedAt: string
}

/** The shape returned by the project-wide timesheet list, whose `task` is populated to a
 * summary rather than a raw id (see WorkLogsRepository.paginateForProject on the backend). */
export interface WorkLogWithTask extends Omit<WorkLog, 'task'> {
  task: { id: string; title: string; issueKey: string | null }
}

export interface WorkLogListQuery {
  page?: number
  limit?: number
  sortOrder?: SortOrder
}

export interface ProjectWorkLogListQuery extends WorkLogListQuery {
  userId?: string
  from?: string
  to?: string
  billable?: boolean
}

export interface WorkLogReportQuery {
  from?: string
  to?: string
}

export interface CreateWorkLogPayload {
  hours: number
  description?: string
  workDate: string
  billable?: boolean
}

export type UpdateWorkLogPayload = Partial<CreateWorkLogPayload>

export interface WorkLogSummary {
  taskId: string
  originalEstimateHours: number | null
  totalLoggedHours: number
  remainingHours: number | null
  varianceHours: number | null
}

export interface WorkLogReportEntry {
  userId: string
  userName: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  entryCount: number
}

export interface WorkLogReport {
  entries: WorkLogReportEntry[]
  totalHours: number
  billableHours: number
  nonBillableHours: number
  /** The project-wide estimate-vs-actual rollup - independent of this report's own date-range
   * filter, since an estimate isn't a dated event the way a logged hour is. */
  totalEstimateHours: number
}

export interface WorkLogCorrelationEntry {
  taskId: string
  issueKey: string | null
  title: string
  storyPoints: number | null
  loggedHours: number
}

export interface WorkLogCorrelationReport {
  entries: WorkLogCorrelationEntry[]
}

export interface WorkLogSprintTaskEntry {
  taskId: string
  issueKey: string | null
  title: string
  originalEstimateHours: number | null
  loggedHours: number
}

export interface WorkLogSprintReport {
  sprintId: string
  sprintName: string
  totalEstimateHours: number
  totalLoggedHours: number
  tasks: WorkLogSprintTaskEntry[]
}

export interface TimesheetBucketEntry {
  id: string
  taskId: string
  issueKey: string | null
  taskTitle: string
  projectId: string
  projectName: string
  hours: number
  workDate: string
  billable: boolean
  description: string
}

export interface TimesheetBucket {
  bucketStart: string
  totalHours: number
  billableHours: number
  entries: TimesheetBucketEntry[]
}

export type TimesheetGroupBy = 'week' | 'month'

export interface MyTimesheetQuery {
  from?: string
  to?: string
  groupBy?: TimesheetGroupBy
}

export interface MyTimesheetReport {
  groupBy: TimesheetGroupBy
  buckets: TimesheetBucket[]
}
