import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { fieldPermissionSchemesService } from '@/services/field-permission-schemes.service'

export function useFieldPermissionSchemes() {
  return useQuery({
    queryKey: queryKeys.fieldPermissionSchemes.all,
    queryFn: () => fieldPermissionSchemesService.list(),
  })
}
