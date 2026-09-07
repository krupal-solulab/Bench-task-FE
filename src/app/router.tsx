import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { MyTasksPage } from '@/pages/tasks/MyTasksPage'
import { TaskDetailPage } from '@/pages/tasks/TaskDetailPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks/my-tasks" element={<MyTasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          <Route element={<RoleRoute roles={['Admin']} />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
