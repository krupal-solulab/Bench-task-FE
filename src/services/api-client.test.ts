import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import {
  apiClient,
  apiGet,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from './api-client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const PROTECTED_PATH = '/protected-resource'

afterEach(() => {
  setAccessToken(null)
  setRefreshHandler(null)
  setUnauthorizedHandler(null)
})

describe('apiClient 401 refresh flow', () => {
  it('refreshes exactly once and replays the original request on a single 401', async () => {
    let callCount = 0
    server.use(
      http.get(`${BASE_URL}${PROTECTED_PATH}`, ({ request }) => {
        callCount += 1
        const auth = request.headers.get('authorization')
        if (auth !== 'Bearer fresh-token') {
          return HttpResponse.json(
            {
              statusCode: 401,
              message: 'Invalid token',
              error: 'Unauthorized',
              timestamp: '',
              path: '',
            },
            { status: 401 },
          )
        }
        return HttpResponse.json({ success: true, data: { ok: true } })
      }),
    )

    const refreshFn = vi.fn().mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
    })
    setRefreshHandler(refreshFn)
    setAccessToken('stale-token')

    const result = await apiGet<{ ok: boolean }>(PROTECTED_PATH)

    expect(result).toEqual({ ok: true })
    expect(refreshFn).toHaveBeenCalledTimes(1)
    expect(callCount).toBe(2)
  })

  it('queues concurrent requests behind a single refresh call', async () => {
    server.use(
      http.get(`${BASE_URL}${PROTECTED_PATH}`, ({ request }) => {
        const auth = request.headers.get('authorization')
        if (auth !== 'Bearer fresh-token') {
          return HttpResponse.json(
            {
              statusCode: 401,
              message: 'Invalid token',
              error: 'Unauthorized',
              timestamp: '',
              path: '',
            },
            { status: 401 },
          )
        }
        return HttpResponse.json({ success: true, data: { ok: true } })
      }),
    )

    const refreshFn = vi.fn().mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
    })
    setRefreshHandler(refreshFn)
    setAccessToken('stale-token')

    const [a, b] = await Promise.all([
      apiGet<{ ok: boolean }>(PROTECTED_PATH),
      apiGet<{ ok: boolean }>(PROTECTED_PATH),
    ])

    expect(a).toEqual({ ok: true })
    expect(b).toEqual({ ok: true })
    expect(refreshFn).toHaveBeenCalledTimes(1)
  })

  it('clears the session and calls the unauthorized handler when refresh itself fails', async () => {
    server.use(
      http.get(`${BASE_URL}${PROTECTED_PATH}`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid token',
            error: 'Unauthorized',
            timestamp: '',
            path: '',
          },
          { status: 401 },
        ),
      ),
    )

    const refreshFn = vi.fn().mockRejectedValue(new Error('refresh failed'))
    const onUnauthorized = vi.fn()
    setRefreshHandler(refreshFn)
    setUnauthorizedHandler(onUnauthorized)
    setAccessToken('stale-token')

    await expect(apiGet(PROTECTED_PATH)).rejects.toBeTruthy()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('never attempts to refresh a request to /auth/refresh itself', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/refresh`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid refresh token',
            error: 'Unauthorized',
            timestamp: '',
            path: '',
          },
          { status: 401 },
        ),
      ),
    )
    const refreshFn = vi.fn()
    setRefreshHandler(refreshFn)

    await expect(apiClient.post('/auth/refresh', { refreshToken: 'x' })).rejects.toBeTruthy()
    expect(refreshFn).not.toHaveBeenCalled()
  })

  it('surfaces a 401 from /auth/login as-is, without attempting a refresh or calling onUnauthorized', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid email or password',
            error: 'Unauthorized',
            timestamp: '',
            path: '',
          },
          { status: 401 },
        ),
      ),
    )
    const refreshFn = vi.fn()
    const onUnauthorized = vi.fn()
    setRefreshHandler(refreshFn)
    setUnauthorizedHandler(onUnauthorized)

    const error = await apiClient
      .post('/auth/login', { email: 'a@a.com', password: 'wrong' })
      .catch((err: unknown) => err)

    expect(refreshFn).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
    // The interceptor's final fallthrough normalises via toApiError before rejecting.
    expect((error as { statusCode?: number }).statusCode).toBe(401)
  })
})
