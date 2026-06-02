'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Project actions
export async function getProjects() {
  const supabase = await createClient()
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        user_id,
        profiles:user_id (full_name, avatar_url)
      ),
      tasks (id, status)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return projects
}

export async function getProject(id: string) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        user_id,
        role,
        profiles:user_id (id, full_name, email, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return project
}

export async function createProject(name: string, description?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, description, owner_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Add creator as owner
  await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: user.id, role: 'owner' })

  revalidatePath('/dashboard/projects')
  return project
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/projects')
}

// Task actions
export async function getTasks(projectId: string) {
  const supabase = await createClient()
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:assignee_id (full_name, avatar_url),
      comments (id)
    `)
    .eq('project_id', projectId)
    .order('position')

  if (error) throw error
  return tasks
}

export async function createTask(
  projectId: string,
  title: string,
  description?: string,
  priority?: string,
  assigneeId?: string,
  dueDate?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get next position
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('position')
    .eq('project_id', projectId)
    .eq('status', 'todo')
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingTasks && existingTasks.length > 0
    ? existingTasks[0].position + 1
    : 0

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      description,
      priority: priority || 'medium',
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) throw error

  // Log activity
  await supabase.from('activity').insert({
    task_id: task.id,
    project_id: projectId,
    user_id: user.id,
    action: 'created',
    details: { title },
  })

  revalidatePath(`/dashboard/project/${projectId}`)
  return task
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string
    due_date?: string
    position?: number
  }
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error

  // Log activity
  await supabase.from('activity').insert({
    task_id: taskId,
    project_id: task.project_id,
    user_id: user.id,
    action: updates.status ? 'moved' : 'updated',
    details: updates,
  })

  revalidatePath(`/dashboard/project/${task.project_id}`)
  return task
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
  if (task) {
    revalidatePath(`/dashboard/project/${task.project_id}`)
  }
}

// Comment actions
export async function addComment(taskId: string, content: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: user.id, content })
    .select()
    .single()

  if (error) throw error
  return comment
}

// Team actions
export async function getTeamMembers(projectId: string) {
  const supabase = await createClient()
  
  const { data: members, error } = await supabase
    .from('project_members')
    .select(`
      user_id,
      role,
      joined_at,
      profiles:user_id (id, full_name, email, avatar_url)
    `)
    .eq('project_id', projectId)

  if (error) throw error
  return members
}

export async function addTeamMember(projectId: string, email: string) {
  const supabase = await createClient()
  
  // Find user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) throw new Error('User not found')

  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: profile.id, role: 'member' })

  if (error) throw error
  revalidatePath(`/dashboard/project/${projectId}`)
}

// Get current user
export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}