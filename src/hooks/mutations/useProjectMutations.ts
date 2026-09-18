import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectsService } from '@/services/projects.service'
import type {
  AutomationRule,
  CreateProjectPayload,
  CustomFieldDefinition,
  CustomFieldOverrideByType,
  MemberPermissions,
  ProjectStatus,
  UpdateProjectPayload,
} from '@/types/project.types'
import type { Workflow } from '@/types/workflow.types'
import type { IssueTypeDefinition } from '@/types/issue-type.types'
import type { NotificationSchemeRule } from '@/types/notification-scheme.types'

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => projectsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useUpdateProjectStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: ProjectStatus) => projectsService.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useAddProjectMembers(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string[]) => projectsService.addMembers(id, userIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(id) })
    },
  })
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reassignTo }: { userId: string; reassignTo?: string }) =>
      projectsService.removeMember(id, userId, reassignTo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

/** A workflow change affects every status name shown throughout the project - the task list
 * queries, the Board's columns, and dashboard aggregation all need to refetch alongside it.
 * Invalidates the whole `workflow` key prefix (every issueType variant, not just the one just
 * edited), since editing one type doesn't change the others but the project's resolved set of
 * in-use statuses (stats/board) can still shift when tasks of any type see it applied. */
function invalidateAfterWorkflowChange(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', id, 'workflow'] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.stats(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
}

export function useUpdateWorkflow(id: string, issueType?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workflow: Workflow) => projectsService.updateWorkflow(id, workflow, issueType),
    onSuccess: (workflow) => {
      queryClient.setQueryData(queryKeys.projects.workflow(id, issueType), workflow)
      invalidateAfterWorkflowChange(queryClient, id)
    },
  })
}

export function useResetWorkflow(id: string, issueType?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => projectsService.resetWorkflow(id, issueType),
    onSuccess: (workflow) => {
      queryClient.setQueryData(queryKeys.projects.workflow(id, issueType), workflow)
      invalidateAfterWorkflowChange(queryClient, id)
    },
  })
}

/** Components/custom-field changes affect any task form or filter that reads the project's
 * definitions, alongside the project detail response they're embedded in. */
function invalidateAfterFieldsChange(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
}

export function useUpdateComponents(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (names: string[]) => projectsService.updateComponents(id, names),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

export function useUpdateCustomFields(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: Array<Partial<CustomFieldDefinition>>) =>
      projectsService.updateCustomFields(id, fields),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

export function useUpdateCustomFieldOverride(id: string, issueType: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (override: Partial<Omit<CustomFieldOverrideByType, 'issueType'>>) =>
      projectsService.updateCustomFieldOverride(id, issueType, override),
    onSuccess: (override) => {
      queryClient.setQueryData(queryKeys.projects.customFieldOverride(id, issueType), override)
      invalidateAfterFieldsChange(queryClient, id)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.effectiveCustomFields(id, issueType),
      })
    },
  })
}

export function useResetCustomFieldOverride(id: string, issueType: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => projectsService.resetCustomFieldOverride(id, issueType),
    onSuccess: (override) => {
      queryClient.setQueryData(queryKeys.projects.customFieldOverride(id, issueType), override)
      invalidateAfterFieldsChange(queryClient, id)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.effectiveCustomFields(id, issueType),
      })
    },
  })
}

export function useUpdateAutomationRules(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rules: Array<Partial<AutomationRule>>) =>
      projectsService.updateAutomationRules(id, rules),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

export function useUpdateNotificationScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rules: NotificationSchemeRule[]) =>
      projectsService.updateNotificationScheme(id, rules),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

export function useUpdateIssueTypes(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueTypes: IssueTypeDefinition[]) =>
      projectsService.updateIssueTypes(id, issueTypes),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

export function useAssignPermissionScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permissionSchemeId: string | null) =>
      projectsService.assignPermissionScheme(id, permissionSchemeId),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
    },
  })
}

export function useSetMemberPermissions(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, patch }: { userId: string; patch: Partial<MemberPermissions> }) =>
      projectsService.setMemberPermissions(id, userId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(id) })
    },
  })
}
