import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectsService } from '@/services/projects.service'
import type {
  CreateProjectPayload,
  ProjectStatus,
  UpdateProjectPayload,
} from '@/types/project.types'

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => projectsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useUpdateProjectStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: ProjectStatus) => projectsService.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useAddProjectMembers(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string[]) => projectsService.addMembers(id, userIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(id) })
    },
  })
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reassignTo }: { userId: string; reassignTo?: string }) =>
      projectsService.removeMember(id, userId, reassignTo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
