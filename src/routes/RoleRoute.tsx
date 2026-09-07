import { Outlet } from 'react-router-dom'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/user.types'

/** Wraps ProtectedRoute; renders the 403 page (not a redirect loop) when the role check fails. */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { hasRole } = useAuth()

  if (!hasRole(...roles)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
