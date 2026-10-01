import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { customFieldLibraryService } from '@/services/custom-field-library.service'
import type {
  CreateLibraryFieldPayload,
  UpdateLibraryFieldPayload,
} from '@/types/custom-field-library.types'

export function useCreateLibraryField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLibraryFieldPayload) => customFieldLibraryService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customFieldLibrary.all })
    },
  })
}

/** A library edit is pushed to every adopting project, so project details are refetched too. */
export function useUpdateLibraryField(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateLibraryFieldPayload) =>
      customFieldLibraryService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customFieldLibrary.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useDeleteLibraryField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customFieldLibraryService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customFieldLibrary.all })
    },
  })
}
