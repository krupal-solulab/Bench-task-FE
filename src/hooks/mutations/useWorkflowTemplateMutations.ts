import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import {
  workflowTemplatesService,
  type WorkflowTemplatePayload,
} from '@/services/workflowTemplates.service'

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: WorkflowTemplatePayload) => workflowTemplatesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflowTemplates.all })
    },
  })
}

export function useUpdateWorkflowTemplate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<WorkflowTemplatePayload>) =>
      workflowTemplatesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflowTemplates.all })
    },
  })
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowTemplatesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflowTemplates.all })
    },
  })
}
