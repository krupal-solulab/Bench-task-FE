import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAccessToken, setRefreshHandler, setUnauthorizedHandler } from '@/services/api-client'
import { authService } from '@/services/auth.service'
import { setDisplayTimeZone } from '@/lib/date'
import type { LoginPayload, RegisterOrganizationPayload } from '@/types/auth.types'
import type { Role, User } from '@/types/user.types'

const REFRESH_TOKEN_STORAGE_KEY = 'ptm.refreshToken'
/** Module 8 gap-closure - the active read-only "view as" session, per browser tab. The Admin's own
 * refresh token (above) is never touched while it exists, so exiting simply resumes it. */
const IMPERSONATION_STORAGE_KEY = 'ptm.impersonation'
/** Where an Admin lands after starting / ending a "view as" session. */
const IMPERSONATION_START_PATH = '/dashboard'
const IMPERSONATION_EXIT_PATH = '/admin/users'

export interface ImpersonationState {
  accessToken: string
  expiresAt: string
  /** The Admin who started this session - shown in the banner. */
  impersonator: Pick<User, 'id' | 'name' | 'email'>
}

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** True only during the initial boot-time refresh; protected routes must wait on this. */
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  registerOrganization: (payload: RegisterOrganizationPayload) => Promise<void>
  logout: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
  /** Applies a freshly-updated user object (Module 11's self-service `PATCH auth/me`) without a
   * full re-login - Topbar/Sidebar read `user` from this same context, so this is what makes an
   * edited name/email show up immediately. */
  updateUser: (user: User) => void
  /** Module 8 gap-closure - set while an Admin is viewing as `user` (read-only). Optional so the
   * many test doubles of this context predating the feature stay valid. */
  impersonation?: ImpersonationState | null
  /** Admin only: start a read-only "view as" session for another user (reloads the app). */
  startImpersonation?: (userId: string) => Promise<void>
  /** Ends the "view as" session and returns to the Admin's own session (reloads the app). */
  stopImpersonation?: () => Promise<void>
  /** Accepts a project invitation with its temporary password and signs the new account in.
   * Optional (like the impersonation members) so older test doubles of this context stay valid. */
  acceptInvite?: (token: string, temporaryPassword: string) => Promise<void>
  /** Sets the first own password of an invite account, replacing the session with a fresh one. */
  setInitialPassword?: (name: string, newPassword: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeRefreshToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    // localStorage can throw in private-browsing / storage-restricted contexts; session just
    // won't survive a reload in that case, which is an acceptable degradation.
  }
}

function getStoredImpersonation(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ImpersonationState
    return new Date(parsed.expiresAt).getTime() > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function sessionStorageHasImpersonation(): boolean {
  return getStoredImpersonation() !== null
}

function storeImpersonation(state: ImpersonationState | null): void {
  try {
    if (state) sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(state))
    else sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
  } catch {
    // Without storage the session can't survive the reload that starts it - startImpersonation
    // surfaces that as a failure rather than silently viewing as nobody.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null)

  // Module 11 gap-closure: dates/times render in the signed-in user's chosen time zone.
  setDisplayTimeZone(user?.timezone)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    storeRefreshToken(null)
    setUser(null)
  }, [])

  const applySession = useCallback(
    (session: { accessToken: string; refreshToken: string; user: User }) => {
      setAccessToken(session.accessToken)
      storeRefreshToken(session.refreshToken)
      setUser(session.user)
    },
    [],
  )

  /** Drops the "view as" session and reloads into the Admin's own (still-stored) session. A full
   * reload is deliberate: it clears every cached query and reconnects the socket as the Admin. */
  const exitImpersonationAndReload = useCallback(() => {
    storeImpersonation(null)
    window.location.assign(IMPERSONATION_EXIT_PATH)
  }, [])

  const refresh = useCallback(async () => {
    // A "view as" token is access-only by design - when it expires the session simply ends.
    if (getStoredImpersonation()) throw new Error('View-as sessions cannot be refreshed')
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) throw new Error('No refresh token available')
    const tokens = await authService.refresh(refreshToken)
    storeRefreshToken(tokens.refreshToken)
    return tokens
  }, [])

  useEffect(() => {
    setRefreshHandler(refresh)
    setUnauthorizedHandler(() => {
      if (sessionStorageHasImpersonation()) {
        exitImpersonationAndReload()
        return
      }
      clearSession()
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?returnTo=${returnTo}`)
    })
    return () => {
      setRefreshHandler(null)
      setUnauthorizedHandler(null)
    }
  }, [refresh, clearSession, exitImpersonationAndReload])

  useEffect(() => {
    async function bootstrap() {
      const viewAs = getStoredImpersonation()
      if (viewAs) {
        try {
          setAccessToken(viewAs.accessToken)
          setUser(await authService.me())
          setImpersonation(viewAs)
          setIsLoading(false)
          return
        } catch {
          // Expired/revoked mid-session - fall back to the Admin's own session below.
          storeImpersonation(null)
          setAccessToken(null)
        }
      }
      // Also clears a stale (expired) entry, so it never outlives its token.
      storeImpersonation(null)
      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        setIsLoading(false)
        return
      }
      try {
        const tokens = await refresh()
        setAccessToken(tokens.accessToken)
        const me = await authService.me()
        setUser(me)
      } catch {
        clearSession()
      } finally {
        setIsLoading(false)
      }
    }
    void bootstrap()
    // Boot-time refresh must only run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const session = await authService.login(payload)
      applySession(session)
    },
    [applySession],
  )

  const acceptInvite = useCallback(
    async (token: string, temporaryPassword: string) => {
      applySession(await authService.acceptInvite(token, temporaryPassword))
    },
    [applySession],
  )

  const setInitialPassword = useCallback(
    async (name: string, newPassword: string) => {
      applySession(await authService.setInitialPassword(name, newPassword))
    },
    [applySession],
  )

  const registerOrganization = useCallback(
    async (payload: RegisterOrganizationPayload) => {
      const session = await authService.registerOrganization(payload)
      applySession(session)
    },
    [applySession],
  )

  const startImpersonation = useCallback(
    async (userId: string) => {
      const session = await authService.impersonate(userId)
      if (!user) return
      storeImpersonation({
        accessToken: session.accessToken,
        expiresAt: new Date(Date.now() + session.expiresInSeconds * 1000).toISOString(),
        impersonator: { id: user.id, name: user.name, email: user.email },
      })
      if (!getStoredImpersonation()) {
        throw new Error('This browser blocked session storage, which "view as" needs')
      }
      window.location.assign(IMPERSONATION_START_PATH)
    },
    [user],
  )

  const stopImpersonation = useCallback(async () => {
    try {
      await authService.endImpersonation()
    } catch {
      // Best-effort audit only - ending the session client-side must always succeed.
    }
    exitImpersonationAndReload()
  }, [exitImpersonationAndReload])

  // The token can't be refreshed, so end the session exactly when it expires.
  useEffect(() => {
    if (!impersonation) return
    const remaining = new Date(impersonation.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(exitImpersonationAndReload, Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [impersonation, exitImpersonationAndReload])

  const logout = useCallback(async () => {
    // Logging out while viewing as someone must never revoke THEIR sessions (the server refuses
    // it anyway) - it simply ends the "view as" session instead.
    if (impersonation) {
      await stopImpersonation()
      return
    }
    try {
      await authService.logout()
    } finally {
      clearSession()
    }
  }, [clearSession, impersonation, stopImpersonation])

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user])

  const updateUser = useCallback((next: User) => setUser(next), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      registerOrganization,
      logout,
      hasRole,
      updateUser,
      impersonation,
      startImpersonation,
      stopImpersonation,
      acceptInvite,
      setInitialPassword,
    }),
    [
      user,
      isLoading,
      login,
      registerOrganization,
      logout,
      hasRole,
      updateUser,
      impersonation,
      startImpersonation,
      stopImpersonation,
      acceptInvite,
      setInitialPassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
