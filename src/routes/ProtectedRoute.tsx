import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { useAuth } from '@/hooks/useAuth'

/** Shows a full-page loader during boot-time refresh so protected routes never flash the login screen. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  return <Outlet />
}
