import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardPreference } from '@/types/dashboard.types'

export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DashboardPreference) => dashboardService.updatePreferences(payload),
    onSuccess: (preference) => {
      queryClient.setQueryData(queryKeys.dashboard.preferences, preference)
    },
  })
}
