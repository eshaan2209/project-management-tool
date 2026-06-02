'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Users,
  Plus,
  LogOut,
} from 'lucide-react'
import Avatar from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    getUser()
  }, [])

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setUser(profile)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-[#111113] border-r border-[#27272a]/60 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#27272a]/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 via-violet-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/30 transition-shadow">
            <span className="text-white font-bold text-sm tracking-tight">P</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ProjectFlow</span>
        </Link>
      </div>

      {/* New Project Button */}
      <div className="p-3">
        <Link
          href="/dashboard/projects"
          onClick={onNavigate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Project
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 space-y-0.5 mt-1">
        {navigation.map((item) => {
          const isActive = mounted && (pathname === item.href || pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#1e1e22] text-white shadow-sm'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#18181b]'
              )}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-violet-400' : ''} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[#27272a]/60">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar name={user?.full_name || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#e4e4e7] truncate leading-tight">{user?.full_name || 'User'}</p>
            <p className="text-[11px] text-[#71717a] truncate leading-tight mt-0.5">{user?.email || 'user@email.com'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-[#71717a] hover:text-red-400 hover:bg-[#1e1e22] rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
