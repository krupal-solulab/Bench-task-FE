import {
  AlertCircle,
  Bookmark,
  Bug,
  CheckSquare,
  Flag,
  Layers,
  ListChecks,
  Star,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IssueTypeIcon } from '@/types/issue-type.types'

/** Name-to-component map for the fixed icon allow-list an issue type's `icon` field picks from -
 * shared by IssueTypeBadge and the Issue Types settings form's icon-swatch picker. */
export const ISSUE_TYPE_ICON_COMPONENTS: Record<IssueTypeIcon, LucideIcon> = {
  Zap,
  Bookmark,
  CheckSquare,
  Bug,
  ListChecks,
  Flag,
  Star,
  AlertCircle,
  Layers,
  Wrench,
}
