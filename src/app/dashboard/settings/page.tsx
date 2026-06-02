'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import { User, Save } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)
        setFullName(profile.full_name || '')
        setEmail(profile.email || '')
      }
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    if (!error) {
      setSaved(true)
      setUser({ ...user, full_name: fullName.trim() })
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  return (
    <>
      <Header title="Settings" />

      <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading settings...</div>
        ) : (
          <div className="max-w-lg">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <User size={20} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Profile</h2>
                  <p className="text-sm text-gray-400">Manage your personal information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !fullName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saved && (
                    <span className="text-sm text-green-400">Saved successfully!</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
              <p className="text-sm text-gray-400">
                Your account is managed by Supabase Auth. To change your password or delete your account,
                please contact support.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
