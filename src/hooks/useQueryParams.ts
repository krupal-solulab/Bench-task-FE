import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Reads/writes an arbitrary filter object to the URL query string so list views are shareable
 * and survive refresh/back-button. `undefined`/empty-string values remove the param entirely.
 */
export function useQueryParams<T extends Record<string, string | number | boolean | undefined>>(
  defaults: T,
) {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => {
    const result = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const raw = searchParams.get(String(key))
      if (raw === null) continue
      const defaultValue = defaults[key]
      if (typeof defaultValue === 'number') {
        result[key] = Number(raw) as T[typeof key]
      } else if (typeof defaultValue === 'boolean') {
        result[key] = (raw === 'true') as T[typeof key]
      } else {
        result[key] = raw as T[typeof key]
      }
    }
    return result
  }, [searchParams, defaults])

  const setParams = useCallback(
    (updates: Partial<T>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return [params, setParams] as const
}
