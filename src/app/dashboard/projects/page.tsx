'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import Badge from '@/components/ui/badge'
import Avatar from '@/components/ui/avatar'
import { FolderKanban, Plus, Search, MoreHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { ProjectCardSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

interface Project {
  id: string
  name: string
  description: string | null
  tasks: { id: string; status: string }[]
  project_members: { profiles: { full_name: string; avatar_url: string | null } | null }[]
  created_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select(`
        *,
        tasks (id, status),
        project_members (
          profiles:user_id (full_name, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setProjects(data as Project[])
    setLoading(false)
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (project) {
      // Add creator as owner
      await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: user.id, role: 'owner' })

      setNewProjectName('')
      setNewProjectDesc('')
      setShowCreateModal(false)
      fetchProjects()
      addToast('Project created', 'success')
    }
    setCreating(false)
  }

  function getProgress(tasks: { status: string }[]) {
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.status === 'done').length
    return Math.round((completed / tasks.length) * 100)
  }

  const filteredProjects = searchQuery.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects

  return (
    <>
      <Header title="Projects" action={{ label: 'New Project', onClick: () => setShowCreateModal(true) }} />
      
      <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No matching projects' : 'No projects yet'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first project to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const progress = getProgress(project.tasks)
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/project/${project.id}`}
                  className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 hover:shadow-lg hover:shadow-black/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <FolderKanban size={20} className="text-violet-400" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-white mb-1">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                  )}

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-gray-300">{project.tasks.length} tasks</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {project.project_members.slice(0, 4).map((member, i) => (
                        <Avatar key={i} name={member.profiles?.full_name || 'User'} size="sm" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {project.project_members.length} member{project.project_members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              )
            })}

            {/* Add Project Card */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gray-900/50 rounded-xl border border-dashed border-gray-700 p-5 hover:border-gray-600 hover:bg-gray-900 transition-all flex flex-col items-center justify-center min-h-[280px] text-gray-400 hover:text-gray-300"
            >
              <Plus size={32} className="mb-2" />
              <span className="font-medium">Create Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My awesome project"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief description of your project..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}