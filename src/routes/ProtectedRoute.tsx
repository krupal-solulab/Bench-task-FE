import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { useAuth } from '@/hooks/useAuth'

const SET_PASSWORD_PATH = '/set-password'

/** Shows a full-page loader during boot-time refresh so protected routes never flash the login screen. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, impersonation } = useAuth()
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

  // An invite account must set its own password before anything else (the API enforces it too).
  if (user?.mustChangePassword && !impersonation && location.pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />
  }

  return <Outlet />
}
