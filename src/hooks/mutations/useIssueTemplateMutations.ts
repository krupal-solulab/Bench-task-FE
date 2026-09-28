import { useMutation, useQueryClient } from '@tanstack/react-query'
import { issueTemplatesService } from '@/services/issue-templates.service'
import type {
  CreateIssueTemplatePayload,
  UpdateIssueTemplatePayload,
} from '@/types/issue-template.types'

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['issue-templates'] })
}

export function useCreateIssueTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateIssueTemplatePayload) => issueTemplatesService.create(payload),
    onSuccess: () => void invalidateAll(queryClient),
  })
}

export function useUpdateIssueTemplate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateIssueTemplatePayload) => issueTemplatesService.update(id, payload),
    onSuccess: () => void invalidateAll(queryClient),
  })
}

export function useDeleteIssueTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => issueTemplatesService.remove(id),
    onSuccess: () => void invalidateAll(queryClient),
  })
}
