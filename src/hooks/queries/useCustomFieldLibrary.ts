import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { customFieldLibraryService } from '@/services/custom-field-library.service'

export function useCustomFieldLibrary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.customFieldLibrary.all,
    queryFn: () => customFieldLibraryService.list(),
    enabled,
  })
}
