'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import Avatar from '@/components/ui/avatar'
import { StatCardSkeleton } from '@/components/ui/skeleton'

interface Project {
  id: string
  name: string
  tasks: { id: string; status: string; due_date: string | null }[]
  project_members: { profiles: { full_name: string; avatar_url: string | null }[] }[]
}

interface Stats {
  totalProjects: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          tasks (id, status),
          project_members (
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (projectsData) {
        setProjects(projectsData as unknown as Project[])

        let completed = 0
        let inProgress = 0
        let overdue = 0
        const now = new Date()
        projectsData.forEach((p: any) => {
          p.tasks.forEach((t: any) => {
            if (t.status === 'done') completed++
            if (t.status === 'in_progress') inProgress++
            if (t.status !== 'done' && t.due_date && new Date(t.due_date) < now) overdue++
          })
        })

        setStats({
          totalProjects: projectsData.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          overdueTasks: overdue,
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { name: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { name: 'Completed', value: stats.completedTasks, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: 'In Progress', value: stats.inProgressTasks, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { name: 'Overdue', value: stats.overdueTasks, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  ]

  return (
    <>
      <Header title="Dashboard" />

      <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-3.5rem)]">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : statCards.map((stat) => (
            <div
              key={stat.name}
              className="bg-[#111113] rounded-xl p-4 border border-[#27272a]/60 hover:border-[#3f3f46]/60 transition-all hover-lift group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bg} border ${stat.border}`}>
                  <stat.icon size={16} className={stat.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#fafafa] tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="text-[13px] text-[#71717a] mt-0.5">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="bg-[#111113] rounded-xl border border-[#27272a]/60 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#27272a]/40">
            <h2 className="text-[15px] font-semibold text-[#fafafa] tracking-tight">Recent Projects</h2>
            <Link
              href="/dashboard/projects"
              className="text-[13px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#52525b] text-[13px]">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-[#18181b] rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#27272a]/60">
                <FolderKanban size={20} className="text-[#52525b]" />
              </div>
              <p className="text-[#a1a1aa] text-[13px] mb-3">No projects yet</p>
              <Link
                href="/dashboard/projects"
                className="text-violet-400 hover:text-violet-300 text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                Create your first project <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#27272a]/40">
              {projects.map((project, idx) => {
                const completed = project.tasks.filter(t => t.status === 'done').length
                const total = project.tasks.length
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/project/${project.id}`}
                    className="px-5 py-3.5 hover:bg-[#18181b]/50 transition-colors flex items-center gap-4 group"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium text-[#e4e4e7] group-hover:text-white transition-colors truncate">{project.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {project.project_members.slice(0, 3).map((m, i) => (
                            <Avatar
                              key={i}
                              name={m.profiles?.[0]?.full_name || 'User'}
                              size="sm"
                            />
                          ))}
                        </div>
                        <span className="text-[12px] text-[#71717a] tabular-nums">
                          {completed}/{total} tasks
                        </span>
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#52525b] mt-1 text-right tabular-nums">{progress}%</p>
                    </div>
                    <ArrowRight size={14} className="text-[#3f3f46] group-hover:text-[#71717a] transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
