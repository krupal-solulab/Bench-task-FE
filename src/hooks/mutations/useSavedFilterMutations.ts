import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savedFiltersService } from '@/services/savedFilters.service'
import type { CreateSavedFilterPayload } from '@/types/saved-filter.types'

export function useCreateSavedFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSavedFilterPayload) => savedFiltersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
  })
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => savedFiltersService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
  })
}
