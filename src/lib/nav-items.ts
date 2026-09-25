import {
  CreditCard,
  LayoutDashboard,
  Link2,
  ListChecks,
  Lock,
  MessageSquareText,
  Milestone,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  FolderKanban,
  Users,
  UserCog,
} from 'lucide-react'
import type { Role } from '@/types/user.types'

export interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: Role[]
}

/** The Sidebar's static route list - also reused by the Cmd+K quick switcher (Module 10) for its
 * "Go to" results, so both stay in sync from one source rather than drifting apart. Pulled into
 * its own file (not exported from Sidebar.tsx directly) purely to keep Sidebar.tsx a
 * component-only module for React Fast Refresh. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks/my-tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/issues', label: 'Issue Navigator', icon: Search },
  { to: '/roadmap', label: 'Roadmap', icon: Milestone },
  { to: '/canned-responses', label: 'Canned Responses', icon: MessageSquareText },
  { to: '/admin/users', label: 'Admin', icon: ShieldCheck, roles: ['Admin'] },
  {
    to: '/admin/permission-schemes',
    label: 'Permission Schemes',
    icon: Lock,
    roles: ['Admin'],
  },
  {
    to: '/admin/security-schemes',
    label: 'Security Schemes',
    icon: ShieldCheck,
    roles: ['Admin'],
  },
  { to: '/admin/project-roles', label: 'Project Roles', icon: UserCog, roles: ['Admin'] },
  { to: '/admin/teams', label: 'Teams', icon: Users, roles: ['Admin', 'Manager'] },
  { to: '/admin/link-types', label: 'Link Types', icon: Link2, roles: ['Admin'] },
  { to: '/admin/billing', label: 'Billing', icon: CreditCard, roles: ['Admin'] },
  { to: '/admin/org-settings', label: 'Org Settings', icon: Settings, roles: ['Admin'] },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['Admin'] },
]
