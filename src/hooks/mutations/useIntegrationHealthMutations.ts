import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { integrationHealthService } from '@/services/integration-health.service'
import type { PausableNotificationChannel } from '@/types/integration-health.types'

/** BRD 8's Platform Admin pause/resume for the Email/WhatsApp notification channels - both
 * endpoints return the full, refreshed integration health list, so the query cache is just
 * replaced with the response rather than needing a separate invalidate + refetch round trip. */
export function usePauseIntegrationChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: PausableNotificationChannel) => integrationHealthService.pause(channel),
    onSuccess: (entries) => {
      queryClient.setQueryData(queryKeys.platform.integrationHealth, entries)
    },
  })
}

export function useResumeIntegrationChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: PausableNotificationChannel) => integrationHealthService.resume(channel),
    onSuccess: (entries) => {
      queryClient.setQueryData(queryKeys.platform.integrationHealth, entries)
    },
  })
}
