import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlatformLayout } from '@/components/layout/PlatformLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { OrgAppGuard } from '@/routes/OrgAppGuard'
import { PlatformOnlyRoute } from '@/routes/PlatformOnlyRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterOrganizationPage } from '@/pages/auth/RegisterOrganizationPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { MyTasksPage } from '@/pages/tasks/MyTasksPage'
import { TaskDetailPage } from '@/pages/tasks/TaskDetailPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { PermissionSchemesPage } from '@/pages/admin/PermissionSchemesPage'
import { BillingPage } from '@/pages/admin/BillingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CannedResponsesPage } from '@/pages/CannedResponsesPage'
import { PlatformOrganizationsListPage } from '@/pages/platform/PlatformOrganizationsListPage'
import { PlatformOrganizationDetailPage } from '@/pages/platform/PlatformOrganizationDetailPage'
import { PlatformApiLogsPage } from '@/pages/platform/PlatformApiLogsPage'
import { PlatformWorkflowTemplatesPage } from '@/pages/platform/PlatformWorkflowTemplatesPage'
import { PlatformIntegrationHealthPage } from '@/pages/platform/PlatformIntegrationHealthPage'
import { PlatformBillingPage } from '@/pages/platform/PlatformBillingPage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterOrganizationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<OrgAppGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/tasks/my-tasks" element={<MyTasksPage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/canned-responses" element={<CannedResponsesPage />} />
            <Route path="/403" element={<ForbiddenPage />} />

            <Route element={<RoleRoute roles={['Admin']} />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/permission-schemes" element={<PermissionSchemesPage />} />
              <Route path="/admin/billing" element={<BillingPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<PlatformOnlyRoute />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<Navigate to="/platform/organizations" replace />} />
            <Route path="/platform/organizations" element={<PlatformOrganizationsListPage />} />
            <Route
              path="/platform/organizations/:id"
              element={<PlatformOrganizationDetailPage />}
            />
            <Route path="/platform/logs" element={<PlatformApiLogsPage />} />
            <Route
              path="/platform/workflow-templates"
              element={<PlatformWorkflowTemplatesPage />}
            />
            <Route path="/platform/integrations" element={<PlatformIntegrationHealthPage />} />
            <Route path="/platform/billing" element={<PlatformBillingPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
