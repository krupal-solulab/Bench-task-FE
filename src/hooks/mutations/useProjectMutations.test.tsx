import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockProjects } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/constants'
import {
  useAddProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectStatus,
} from '@/hooks/mutations/useProjectMutations'
import type { Project } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateProjectStatus', () => {
  it('invalidates the project detail, project list, and dashboard caches on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const project = mockProjects[0] as Project

    server.use(
      http.patch(url(`/projects/${project.id}/status`), () =>
        HttpResponse.json({ success: true, data: { ...project, status: 'Completed' } }),
      ),
    )

    const { result } = renderHook(() => useUpdateProjectStatus(project.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate('Completed')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.projects.detail(project.id) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.projects.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all })
  })

  it('surfaces a rejected illegal transition as a mutation error', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const project = mockProjects[1] as Project

    server.use(
      http.patch(url(`/projects/${project.id}/status`), () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'Cannot complete project: 2 task(s) are not yet Done',
            error: 'Conflict',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 409 },
        ),
      ),
    )

    const { result } = renderHook(() => useUpdateProjectStatus(project.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate('Completed')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useAddProjectMembers', () => {
  it('invalidates the project detail and members caches on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const project = mockProjects[0] as Project

    server.use(
      http.post(url(`/projects/${project.id}/members`), () =>
        HttpResponse.json({ success: true, data: project }),
      ),
    )

    const { result } = renderHook(() => useAddProjectMembers(project.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate(['u-dev1'])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.projects.detail(project.id) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.projects.members(project.id) })
  })
})

describe('useRemoveProjectMember', () => {
  it('sends the reassignTo query param when provided, and invalidates tasks too', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const project = mockProjects[0] as Project
    let capturedReassignTo: string | null = null

    server.use(
      http.delete(url(`/projects/${project.id}/members/u-dev1`), ({ request }) => {
        const requestUrl = new URL(request.url)
        capturedReassignTo = requestUrl.searchParams.get('reassignTo')
        return HttpResponse.json({ success: true, data: project })
      }),
    )

    const { result } = renderHook(() => useRemoveProjectMember(project.id), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ userId: 'u-dev1', reassignTo: 'u-dev2' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedReassignTo).toBe('u-dev2')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.all })
  })
})
