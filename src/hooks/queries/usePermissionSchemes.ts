import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { permissionSchemesService } from '@/services/permissionSchemes.service'

export function usePermissionSchemes() {
  return useQuery({
    queryKey: queryKeys.permissionSchemes.all,
    queryFn: () => permissionSchemesService.list(),
  })
}
