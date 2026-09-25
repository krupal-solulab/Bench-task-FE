import {
  ChevronsLeft,
  ChevronsRight,
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
import { motion } from 'framer-motion'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import type { Role } from '@/types/user.types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: Role[]
}

const NAV_ITEMS: NavItem[] = [
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

export function Sidebar() {
  const { hasRole } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles))

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r bg-card transition-[width] duration-300 ease-smooth md:flex md:flex-col',
        collapsed ? 'md:w-16' : 'md:w-56',
      )}
    >
      <nav className="flex-1 space-y-1 p-2" aria-label="Primary">
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                'transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-md bg-primary/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <item.icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex items-center justify-center gap-2 border-t p-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
