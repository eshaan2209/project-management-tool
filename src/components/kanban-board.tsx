'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/badge'
import Avatar from '@/components/ui/avatar'
import {
  MessageSquare,
  Plus,
  X,
  Calendar,
  Send,
  Trash2,
  Search,
} from 'lucide-react'
import { KanbanColumnSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { createNotification } from '@/lib/notifications'
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts'

export interface Task {
  id: string
  title: string
  description?: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: { full_name: string; avatar_url: string | null } | null
  assignee_id?: string | null
  due_date?: string | null
  comments?: { id: string; content: string; created_at: string; user_id: string; profiles?: { full_name: string } | null }[]
}

interface ProjectMember {
  user_id: string
  role: string
  profiles: { full_name: string; email: string; avatar_url: string | null } | null
}

interface KanbanBoardProps {
  projectId: string
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-yellow-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskColumn, setNewTaskColumn] = useState<string>('todo')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const { addToast } = useToast()

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'n': () => { if (!showTaskDetail) { setNewTaskColumn('todo'); setShowAddTask(true) } },
    'escape': () => {
      if (showTaskDetail) { setShowTaskDetail(false); setSelectedTask(null) }
      else if (showAddTask) { setShowAddTask(false) }
    },
    '/': () => {
      const searchInput = document.querySelector('[data-search-tasks]') as HTMLInputElement
      if (searchInput) searchInput.focus()
    },
  }, !showAddTask && !showTaskDetail || showTaskDetail)

  useEffect(() => {
    fetchTasks()
    fetchMembers()

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [projectId])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assignee_id (full_name, avatar_url),
        comments (id, content, created_at, user_id, profiles:user_id (full_name))
      `)
      .eq('project_id', projectId)
      .order('position')

    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('project_members')
      .select('user_id, role, profiles:user_id (full_name, email, avatar_url)')
      .eq('project_id', projectId)

    if (data) setMembers(data as unknown as ProjectMember[])
  }

  async function handleDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ))

    await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return

    const columnTasks = tasks.filter(t => t.status === newTaskColumn)
    const nextPosition = columnTasks.length

    const { data } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: newTaskTitle.trim(),
        status: newTaskColumn,
        priority: 'medium',
        position: nextPosition,
      })
      .select(`
        *,
        assignee:assignee_id (full_name, avatar_url),
        comments (id, content, created_at, user_id, profiles:user_id (full_name))
      `)
      .single()

    if (data) {
      setTasks(prev => [...prev, data as Task])
      setNewTaskTitle('')
      setShowAddTask(false)
      addToast('Task created', 'success')
    }
  }

  async function handleDeleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) {
      setShowTaskDetail(false)
      setSelectedTask(null)
    }
    addToast('Task deleted', 'info')
  }

  async function handleUpdateTask(taskId: string, updates: Partial<Task>) {
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ))
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : prev)
      }
      addToast('Task updated', 'success')

      // Notify newly assigned user
      if (updates.assignee_id && updates.assignee_id !== selectedTask?.assignee_id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: assignerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

          const taskTitle = selectedTask?.title || 'a task'
          createNotification({
            userId: updates.assignee_id,
            projectId,
            taskId,
            type: 'assigned',
            message: `${assignerProfile?.full_name || 'Someone'} assigned you to "${taskTitle}"`,
          })
        }
      }
    } else {
      addToast('Failed to update task', 'error')
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !selectedTask) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('comments')
      .insert({
        task_id: selectedTask.id,
        user_id: user.id,
        content: newComment.trim(),
      })
      .select('id, content, created_at, user_id, profiles:user_id (full_name)')
      .single()

    if (data) {
      const commentData = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
      }
      const updatedTask = {
        ...selectedTask,
        comments: [...(selectedTask.comments || []), commentData],
      }
      setSelectedTask(updatedTask)
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id ? updatedTask : t
      ))
      setNewComment('')
      addToast('Comment added', 'success')

      // Notify assignee if someone else commented
      if (selectedTask.assignee_id && selectedTask.assignee_id !== user.id) {
        const { data: commenterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        createNotification({
          userId: selectedTask.assignee_id,
          projectId,
          taskId: selectedTask.id,
          type: 'commented',
          message: `${commenterProfile?.full_name || 'Someone'} commented on "${selectedTask.title}"`,
        })
      }
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!selectedTask) return

    await supabase.from('comments').delete().eq('id', commentId)

    const updatedComments = (selectedTask.comments || []).filter(c => c.id !== commentId)
    const updatedTask = { ...selectedTask, comments: updatedComments }
    setSelectedTask(updatedTask)
    setTasks(prev => prev.map(t =>
      t.id === selectedTask.id ? updatedTask : t
    ))
  }

  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-yellow-500',
    urgent: 'bg-red-500',
  }

  const priorityBadgeVariant = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
  }

  function openTaskDetail(task: Task) {
    setSelectedTask(task)
    setShowTaskDetail(true)
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery.trim() ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  if (loading) {
    return (
      <div className="flex gap-4 p-6 overflow-x-auto h-full">
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex items-center gap-2.5 px-6 py-2.5 border-b border-[#27272a]/40">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks... (press /)"
            data-search-tasks
            className="w-full pl-8 pr-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[13px] text-[#d4d4d8] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
          />
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-2.5 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[13px] text-[#a1a1aa] focus:outline-none focus:border-[#3f3f46] transition-all cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Columns */}
      <div className="flex gap-3 p-4 overflow-x-auto flex-1">
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.id)
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72 bg-[#111113]/60 rounded-xl border border-[#27272a]/60 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="p-3 flex items-center justify-between border-b border-[#27272a]/40">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <h3 className="text-[13px] font-medium text-[#a1a1aa]">{column.title}</h3>
                <span className="text-[11px] text-[#52525b] bg-[#1e1e22] px-1.5 py-0.5 rounded tabular-nums">
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setNewTaskColumn(column.id)
                  setShowAddTask(true)
                }}
                className="p-1 hover:bg-[#1e1e22] rounded-md transition-colors text-[#52525b] hover:text-[#a1a1aa]"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => openTaskDetail(task)}
                  className="bg-[#18181b] rounded-lg p-3 border border-[#27272a]/60 hover:border-[#3f3f46]/60 transition-all cursor-grab active:cursor-grabbing group hover-lift"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', priorityColors[task.priority])} />
                      <Badge variant={priorityBadgeVariant[task.priority] as any}>
                        {task.priority}
                      </Badge>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#27272a] rounded transition-all"
                    >
                      <X size={12} className="text-[#52525b]" />
                    </button>
                  </div>

                  <h4 className="text-[13px] font-medium text-[#e4e4e7] mb-1 leading-snug">{task.title}</h4>

                  {task.description && (
                    <p className="text-[12px] text-[#71717a] mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#27272a]/30">
                    <div className="flex items-center gap-2.5">
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
                          <Calendar size={11} />
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                      {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
                          <MessageSquare size={11} />
                          {task.comments.length}
                        </div>
                      )}
                    </div>
                    {task.assignee && (
                      <Avatar name={task.assignee.full_name} size="sm" />
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setNewTaskColumn(column.id)
                  setShowAddTask(true)
                }}
                className="w-full py-2 border border-dashed border-[#27272a]/60 rounded-lg text-[#52525b] hover:text-[#71717a] hover:border-[#3f3f46]/60 transition-all flex items-center justify-center gap-1.5 text-[12px]"
              >
                <Plus size={16} />
                Add task
              </button>
            </div>
          </div>
        )
      })}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#111113] rounded-xl border border-[#27272a]/80 p-5 w-full max-w-md shadow-2xl shadow-black/50 animate-fade-in-scale">
            <h3 className="text-[15px] font-semibold text-[#fafafa] mb-4">New Task</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') setShowAddTask(false)
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-3 py-1.5 text-[13px] text-[#71717a] hover:text-[#d4d4d8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[13px] font-medium transition-all shadow-sm shadow-violet-600/20"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail / Edit Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] rounded-xl border border-[#27272a]/80 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 animate-fade-in-scale">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]/40">
              <h3 className="text-[15px] font-semibold text-[#fafafa]">Task Details</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="p-1.5 text-[#71717a] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete task"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => { setShowTaskDetail(false); setSelectedTask(null) }}
                  className="p-1.5 text-[#71717a] hover:text-[#d4d4d8] hover:bg-[#1e1e22] rounded-lg transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Title</label>
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) => {
                    const updated = { ...selectedTask, title: e.target.value }
                    setSelectedTask(updated)
                  }}
                  onBlur={() => handleUpdateTask(selectedTask.id, { title: selectedTask.title })}
                  className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) => {
                    const updated = { ...selectedTask, description: e.target.value }
                    setSelectedTask(updated)
                  }}
                  onBlur={() => handleUpdateTask(selectedTask.id, { description: selectedTask.description || null })}
                  rows={3}
                  placeholder="Add a description..."
                  className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 resize-none transition-all"
                />
              </div>

              {/* Row: Priority + Status + Assignee + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => {
                      const val = e.target.value as Task['priority']
                      setSelectedTask(prev => prev ? { ...prev, priority: val } : prev)
                      handleUpdateTask(selectedTask.id, { priority: val })
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] focus:outline-none focus:border-[#3f3f46] transition-all cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      const val = e.target.value as Task['status']
                      setSelectedTask(prev => prev ? { ...prev, status: val } : prev)
                      handleUpdateTask(selectedTask.id, { status: val })
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] focus:outline-none focus:border-[#3f3f46] transition-all cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Assignee</label>
                  <select
                    value={selectedTask.assignee_id || ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      const member = members.find(m => m.user_id === val)
                      setSelectedTask(prev => prev ? {
                        ...prev,
                        assignee_id: val,
                        assignee: member ? { full_name: member.profiles?.full_name || '', avatar_url: member.profiles?.avatar_url || null } : null,
                      } : prev)
                      handleUpdateTask(selectedTask.id, { assignee_id: val })
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] focus:outline-none focus:border-[#3f3f46] transition-all cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setSelectedTask(prev => prev ? { ...prev, due_date: val } : prev)
                      handleUpdateTask(selectedTask.id, { due_date: val })
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] focus:outline-none focus:border-[#3f3f46] transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-[11px] font-medium text-[#52525b] uppercase tracking-wider mb-2.5">
                  Comments ({selectedTask.comments?.length || 0})
                </label>

                <div className="space-y-2.5 mb-3">
                  {selectedTask.comments?.map((comment) => (
                    <div key={comment.id} className="bg-[#18181b] rounded-lg p-3 border border-[#27272a]/40 group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar name={comment.profiles?.full_name || 'User'} size="sm" />
                          <span className="text-[13px] font-medium text-[#e4e4e7]">{comment.profiles?.full_name || 'User'}</span>
                          <span className="text-[11px] text-[#52525b]">
                            {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#27272a] rounded transition-all"
                        >
                          <X size={11} className="text-[#52525b]" />
                        </button>
                      </div>
                      <p className="text-[13px] text-[#a1a1aa] mt-1.5 leading-relaxed">{comment.content}</p>
                    </div>
                  ))}

                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <p className="text-[13px] text-[#52525b] py-2">No comments yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment()
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-sm shadow-violet-600/20"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
