import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectRolesService } from '@/services/project-roles.service'

export function useProjectRoles() {
  return useQuery({
    queryKey: queryKeys.projectRoles.all,
    queryFn: () => projectRolesService.list(),
  })
}
