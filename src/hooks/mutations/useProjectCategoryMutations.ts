import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectCategoriesService } from '@/services/project-categories.service'
import type { ProjectCategoryPayload } from '@/types/project-category.types'

export function useCreateProjectCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectCategoryPayload) => projectCategoriesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectCategories.all })
    },
  })
}

export function useUpdateProjectCategory(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<ProjectCategoryPayload>) =>
      projectCategoriesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectCategories.all })
    },
  })
}

export function useDeleteProjectCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectCategoriesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectCategories.all })
    },
  })
}
