'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import KanbanBoard from '@/components/kanban-board'
import TaskListView from '@/components/task-list-view'
import ActivityFeed from '@/components/activity-feed'
import { LayoutGrid, List, Users, Settings, Plus, X, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { createNotification } from '@/lib/notifications'

interface Project {
  id: string
  name: string
  description: string | null
  project_members: {
    user_id: string
    role: string
    profiles: { full_name: string; email: string; avatar_url: string | null } | null
  }[]
}

const views = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: List },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const [activeView, setActiveView] = useState('board')
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [settingsName, setSettingsName] = useState('')
  const [settingsDesc, setSettingsDesc] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    fetchProject()
  }, [projectId])

  async function fetchProject() {
    const { data } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          user_id,
          role,
          profiles:user_id (full_name, email, avatar_url)
        )
      `)
      .eq('id', projectId)
      .single()

    if (data) {
      setProject(data as Project)
      setSettingsName(data.name)
      setSettingsDesc(data.description || '')
    }
    setLoading(false)
  }

  async function handleAddMember() {
    if (!newMemberEmail.trim()) return

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newMemberEmail.trim())
      .single()

    if (!profile) {
      addToast('User not found with that email', 'error')
      return
    }

    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: profile.id, role: 'member' })

    if (!error) {
      setNewMemberEmail('')
      setShowAddMember(false)
      fetchProject()
      addToast('Member added', 'success')

      // Notify the new member
      createNotification({
        userId: profile.id,
        projectId,
        type: 'added_to_project',
        message: `You were added to project "${project?.name || 'a project'}"`,
      })
    } else {
      addToast('Failed to add member', 'error')
    }
  }

  async function handleSaveSettings() {
    if (!settingsName.trim()) return
    setSavingSettings(true)
    setSettingsSaved(false)

    const { error } = await supabase
      .from('projects')
      .update({
        name: settingsName.trim(),
        description: settingsDesc.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (!error) {
      setProject(prev => prev ? { ...prev, name: settingsName.trim(), description: settingsDesc.trim() || null } : prev)
      setSettingsSaved(true)
      addToast('Settings saved', 'success')
      setTimeout(() => setSettingsSaved(false), 2000)
    } else {
      addToast('Failed to save settings', 'error')
    }

    setSavingSettings(false)
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-gray-500">Loading project...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title={project?.name || 'Project'}
        action={{ label: 'Add Task', onClick: () => {} }}
      />

      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* View Tabs */}
        <div className="border-b border-gray-800 px-6">
          <div className="flex gap-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeView === view.id
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                <view.icon size={16} />
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'board' && <KanbanBoard projectId={projectId} />}
          
          {activeView === 'members' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Team Members</h2>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Add Member
                </button>
              </div>

              <div className="space-y-3">
                {project?.project_members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.profiles?.full_name || 'User'} size="md" />
                      <div>
                        <p className="font-medium text-white">{member.profiles?.full_name}</p>
                        <p className="text-sm text-gray-400">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 capitalize px-3 py-1 bg-gray-800 rounded-full">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'list' && (
            <TaskListView projectId={projectId} />
          )}

          {activeView === 'activity' && (
            <div className="h-full overflow-y-auto">
              <ActivityFeed projectId={projectId} />
            </div>
          )}
          
          {activeView === 'settings' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Project Settings</h2>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={settingsDesc}
                      onChange={(e) => setSettingsDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings || !settingsName.trim()}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {savingSettings ? 'Saving...' : 'Save Changes'}
                    </button>
                    {settingsSaved && (
                      <span className="text-sm text-green-400">Saved!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Team Member</h3>
              <button onClick={() => setShowAddMember(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Enter email address..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMember()
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}