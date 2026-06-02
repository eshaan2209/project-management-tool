'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus } from 'lucide-react'
import Avatar from '@/components/ui/avatar'
import NotificationBell from '@/components/notification-bell'

interface HeaderProps {
  title: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function Header({ title, action }: HeaderProps) {
  const [userName, setUserName] = useState('User')
  const supabase = createClient()

  useEffect(() => {
    getUser()
  }, [])

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (profile) setUserName(profile.full_name || 'User')
    }
  }

  return (
    <header className="h-14 bg-[#111113]/80 backdrop-blur-xl border-b border-[#27272a]/60 flex items-center justify-between px-6 lg:px-6 pl-16 lg:pl-6">
      <div>
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-9 pr-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[13px] text-[#d4d4d8] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
          />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[13px] font-medium transition-all shadow-sm shadow-violet-600/20"
          >
            <Plus size={14} strokeWidth={2.5} />
            {action.label}
          </button>
        )}

        {/* Avatar */}
        <div className="ml-1">
          <Avatar name={userName} size="sm" />
        </div>
      </div>
    </header>
  )
}
