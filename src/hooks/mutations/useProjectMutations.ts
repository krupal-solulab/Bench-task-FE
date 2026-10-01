import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectsService } from '@/services/projects.service'
import { customFieldLibraryService } from '@/services/custom-field-library.service'
import type {
  AutomationRule,
  CreateProjectPayload,
  CustomFieldDefinition,
  CustomFieldOverrideByType,
  DefaultApproversPayload,
  MemberPermissions,
  ProjectStatus,
  SlaPolicyEntry,
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

/** Module 6 gap-closure: assigns/clears one component's lead - kept separate from
 * useUpdateComponents above, matching the backend's own separate PATCH route. */
export function useUpdateComponentLead(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, leadUserId }: { name: string; leadUserId: string | null }) =>
      projectsService.updateComponentLead(id, name, leadUserId),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
    },
  })
}

/** Module 6 gap-closure: sets/replaces the project's default-approver grant for Approval
 * Workflows. */
export function useUpdateDefaultApprovers(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (grant: DefaultApproversPayload) =>
      projectsService.updateDefaultApprovers(id, grant),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
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

export function useUpdateSlaPolicy(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entries: SlaPolicyEntry[]) => projectsService.updateSlaPolicy(id, entries),
    onSuccess: (entries) => {
      queryClient.setQueryData(queryKeys.projects.slaPolicy(id), entries)
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

export function useAssignSecurityScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (securitySchemeId: string | null) =>
      projectsService.assignSecurityScheme(id, securitySchemeId),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
    },
  })
}

export function useAssignFieldPermissionScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fieldPermissionSchemeId: string | null) =>
      projectsService.assignFieldPermissionScheme(id, fieldPermissionSchemeId),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
    },
  })
}

export function useSetRoleAssignment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectRoleId,
      ...patch
    }: { projectRoleId: string } & { userIds?: string[]; teamIds?: string[] }) =>
      projectsService.setRoleAssignment(id, projectRoleId, patch),
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

/** Module 8 gap-closure - add an org library field to this project's custom fields. */
export function useAdoptLibraryField(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, required }: { entryId: string; required: boolean }) =>
      customFieldLibraryService.adopt(id, entryId, required),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      invalidateAfterFieldsChange(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.customFieldLibrary.all })
    },
  })
}

/** Module 8 gap-closure - archive (hide + read-only) / restore a project. */
export function useSetProjectArchived(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (archived: boolean) =>
      archived ? projectsService.archive(id) : projectsService.unarchive(id),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
