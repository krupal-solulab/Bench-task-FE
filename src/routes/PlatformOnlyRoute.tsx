import { Outlet } from 'react-router-dom'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { useAuth } from '@/hooks/useAuth'

/** Wraps ProtectedRoute; renders the 403 page (not a redirect loop) when the caller isn't a PlatformAdmin. */
export function PlatformOnlyRoute() {
  const { hasRole } = useAuth()

  if (!hasRole('PlatformAdmin')) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
