'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import Avatar from '@/components/ui/avatar'
import Badge from '@/components/ui/badge'
import { Users, FolderKanban } from 'lucide-react'

interface TeamMember {
  user_id: string
  role: string
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
  } | null
  projectNames: string[]
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  async function fetchTeamMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get projects the current user belongs to
    const { data: myProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)

    if (!myProjects || myProjects.length === 0) { setLoading(false); return }

    const projectIds = myProjects.map(m => m.project_id)

    // Get all members of those projects with their profiles
    const { data: allMembers } = await supabase
      .from('project_members')
      .select('user_id, role, profiles:user_id (full_name, email, avatar_url)')
      .in('project_id', projectIds)

    if (!allMembers) { setLoading(false); return }

    // Get project memberships to build project name mapping
    const { data: projectLinks } = await supabase
      .from('project_members')
      .select('user_id, project_id')
      .in('project_id', projectIds)

    // Get project names
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)

    const projectNameMap = new Map<string, string>()
    projects?.forEach(p => projectNameMap.set(p.id, p.name))

    // Deduplicate members
    const memberMap = new Map<string, TeamMember>()

    for (const m of allMembers as any[]) {
      if (!memberMap.has(m.user_id)) {
        memberMap.set(m.user_id, {
          user_id: m.user_id,
          role: m.role,
          profiles: m.profiles,
          projectNames: [],
        })
      }
    }

    // Attach project names
    for (const link of projectLinks || []) {
      const member = memberMap.get(link.user_id)
      const projectName = projectNameMap.get(link.project_id)
      if (member && projectName && !member.projectNames.includes(projectName)) {
        member.projectNames.push(projectName)
      }
    }

    setMembers(Array.from(memberMap.values()))
    setLoading(false)
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'warning'
      case 'admin': return 'info'
      default: return 'default'
    }
  }

  return (
    <>
      <Header title="Team" />

      <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No team members yet</h3>
            <p className="text-gray-400">Add members to your projects to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <Avatar name={member.profiles?.full_name || 'User'} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{member.profiles?.full_name}</h3>
                    <p className="text-sm text-gray-400 truncate">{member.profiles?.email}</p>
                  </div>
                  <Badge variant={roleBadgeVariant(member.role) as any}>{member.role}</Badge>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Projects</p>
                  <div className="flex flex-wrap gap-2">
                    {member.projectNames.length > 0 ? (
                      member.projectNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 rounded-lg text-xs text-gray-300"
                        >
                          <FolderKanban size={12} className="text-violet-400" />
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No projects</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
