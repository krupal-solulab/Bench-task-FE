import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Wraps ProtectedRoute, in front of the org-facing AppLayout tree.
 *
 * A PlatformAdmin hitting any org route would see a shell where every API call 403s server-side
 * (they belong to no organization), so redirect them straight to the area they actually have
 * instead of a broken page full of failed requests.
 */
export function OrgAppGuard() {
  const { hasRole } = useAuth()

  if (hasRole('PlatformAdmin')) {
    return <Navigate to="/platform/organizations" replace />
  }

  return <Outlet />
}
