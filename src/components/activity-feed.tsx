'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/avatar'
import {
  Plus,
  Pencil,
  ArrowRight,
  MessageSquare,
  UserPlus,
  Trash2,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  action: string
  details: any
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
  tasks: { title: string } | null
}

interface ActivityFeedProps {
  projectId: string
}

const actionConfig: Record<string, { icon: any; color: string; label: (details: any, taskTitle: string) => string }> = {
  created: {
    icon: Plus,
    color: 'text-green-400',
    label: (d, t) => `created task "${t}"`,
  },
  updated: {
    icon: Pencil,
    color: 'text-blue-400',
    label: (d, t) => `updated task "${t}"`,
  },
  moved: {
    icon: ArrowRight,
    color: 'text-yellow-400',
    label: (d, t) => {
      const from = d?.status ? d.status.replace('_', ' ') : 'a column'
      return `moved "${t}" to ${from}`
    },
  },
  commented: {
    icon: MessageSquare,
    color: 'text-violet-400',
    label: (d, t) => `commented on "${t}"`,
  },
  assigned: {
    icon: UserPlus,
    color: 'text-cyan-400',
    label: (d, t) => `assigned someone to "${t}"`,
  },
  deleted: {
    icon: Trash2,
    color: 'text-red-400',
    label: (d, t) => `deleted task "${t}"`,
  },
}

export default function ActivityFeed({ projectId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchActivities()

    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity', filter: `project_id=eq.${projectId}` },
        (payload) => {
          fetchActivities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  async function fetchActivities() {
    const { data } = await supabase
      .from('activity')
      .select(`
        id,
        action,
        details,
        created_at,
        profiles:user_id (full_name, avatar_url),
        tasks:task_id (title)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) setActivities(data as unknown as ActivityItem[])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-800 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const config = actionConfig[activity.action] || actionConfig.updated
            const Icon = config.icon
            const taskTitle = activity.tasks?.title || 'Unknown task'

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Avatar name={activity.profiles?.full_name || 'User'} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">{activity.profiles?.full_name || 'User'}</span>
                    {' '}
                    <span className={config.color}>{config.label(activity.details, taskTitle)}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
