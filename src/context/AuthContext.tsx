import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAccessToken, setRefreshHandler, setUnauthorizedHandler } from '@/services/api-client'
import { authService } from '@/services/auth.service'
import type { LoginPayload, RegisterOrganizationPayload } from '@/types/auth.types'
import type { Role, User } from '@/types/user.types'

const REFRESH_TOKEN_STORAGE_KEY = 'ptm.refreshToken'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** True only during the initial boot-time refresh; protected routes must wait on this. */
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  registerOrganization: (payload: RegisterOrganizationPayload) => Promise<void>
  logout: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const refresh = useCallback(async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) throw new Error('No refresh token available')
    const tokens = await authService.refresh(refreshToken)
    storeRefreshToken(tokens.refreshToken)
    return tokens
  }, [])

  useEffect(() => {
    setRefreshHandler(refresh)
    setUnauthorizedHandler(() => {
      clearSession()
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?returnTo=${returnTo}`)
    })
    return () => {
      setRefreshHandler(null)
      setUnauthorizedHandler(null)
    }
  }, [refresh, clearSession])

  useEffect(() => {
    async function bootstrap() {
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

  const registerOrganization = useCallback(
    async (payload: RegisterOrganizationPayload) => {
      const session = await authService.registerOrganization(payload)
      applySession(session)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      registerOrganization,
      logout,
      hasRole,
    }),
    [user, isLoading, login, registerOrganization, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
