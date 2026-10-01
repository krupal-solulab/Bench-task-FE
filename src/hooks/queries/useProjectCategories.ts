import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectCategoriesService } from '@/services/project-categories.service'

export function useProjectCategories() {
  return useQuery({
    queryKey: queryKeys.projectCategories.all,
    queryFn: () => projectCategoriesService.list(),
  })
}
