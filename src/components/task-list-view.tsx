'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/badge'
import Avatar from '@/components/ui/avatar'
import { Calendar, MessageSquare, Plus, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Task {
  id: string
  title: string
  description?: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: { full_name: string; avatar_url: string | null } | null
  due_date?: string | null
  comments?: { id: string }[]
}

interface TaskListViewProps {
  projectId: string
  onTaskClick?: (task: Task) => void
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

const priorityBadgeVariant = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-yellow-500',
  urgent: 'bg-red-500',
}

export default function TaskListView({ projectId, onTaskClick }: TaskListViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('priority')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    fetchTasks()
  }, [projectId])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assignee_id (full_name, avatar_url),
        comments (id)
      `)
      .eq('project_id', projectId)
      .order('position')

    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return

    const { data } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: 'medium',
        position: tasks.length,
      })
      .select(`
        *,
        assignee:assignee_id (full_name, avatar_url),
        comments (id)
      `)
      .single()

    if (data) {
      setTasks(prev => [...prev, data as Task])
      setNewTaskTitle('')
      setShowAddTask(false)
      addToast('Task created', 'success')
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ))
  }

  async function handleDeleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    addToast('Task deleted', 'info')
  }

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }

  let filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  if (sortBy === 'priority') {
    filteredTasks = [...filteredTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  } else if (sortBy === 'title') {
    filteredTasks = [...filteredTasks].sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy === 'date') {
    filteredTasks = [...filteredTasks].sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }

  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              filter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            All ({taskCounts.all})
          </button>
          {statusOptions.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5',
                filter === s.value ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', s.color)} />
              {s.label} ({taskCounts[s.value as keyof typeof taskCounts]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
            <option value="date">Sort by Due Date</option>
          </select>

          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-900 rounded-xl border border-gray-800">
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {filter === 'all' ? 'No tasks yet' : `No ${filter.replace('_', ' ')} tasks`}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Due Date</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      {statusOptions.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                      <Badge variant={priorityBadgeVariant[task.priority] as any}>{task.priority}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={task.assignee.full_name} size="sm" />
                        <span className="text-sm text-gray-300">{task.assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.due_date ? (
                      <span className="text-sm text-gray-300 flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-500" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {task.comments && task.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare size={12} />
                          {task.comments.length}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded transition-all"
                      >
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add Task</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') setShowAddTask(false)
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
