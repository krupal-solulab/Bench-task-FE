import { useParams } from 'react-router-dom'
import { TaskDetailView } from '@/components/tasks/TaskDetailView'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  return <TaskDetailView taskId={id} layout="page" />
}
