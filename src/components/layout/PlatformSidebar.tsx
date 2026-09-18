import {
  Activity,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ScrollText,
  Workflow,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: typeof Building2
}

// No role filtering here — the whole /platform area is already gated by PlatformOnlyRoute.
const NAV_ITEMS: NavItem[] = [
  { to: '/platform/organizations', label: 'Organizations', icon: Building2 },
  { to: '/platform/workflow-templates', label: 'Workflow Templates', icon: Workflow },
  { to: '/platform/logs', label: 'API Logs', icon: ScrollText },
  { to: '/platform/integrations', label: 'Integration Health', icon: Activity },
  { to: '/platform/billing', label: 'Billing Overview', icon: CreditCard },
]

export function PlatformSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r bg-card transition-[width] duration-300 ease-smooth md:flex md:flex-col',
        collapsed ? 'md:w-16' : 'md:w-56',
      )}
    >
      <nav className="flex-1 space-y-1 p-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
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
                  layoutId="platform-sidebar-active-pill"
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
