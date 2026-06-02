import { createClient } from '@/lib/supabase/client'

interface CreateNotificationParams {
  userId: string
  projectId?: string
  taskId?: string
  type: 'assigned' | 'commented' | 'status_change' | 'added_to_project'
  message: string
}

export async function createNotification({
  userId,
  projectId,
  taskId,
  type,
  message,
}: CreateNotificationParams) {
  const supabase = createClient()

  await supabase.from('notifications').insert({
    user_id: userId,
    project_id: projectId || null,
    task_id: taskId || null,
    type,
    message,
  })
}
