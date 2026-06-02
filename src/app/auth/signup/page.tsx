'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-violet-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/25">
            <span className="text-white font-bold text-base">P</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">ProjectFlow</span>
        </div>

        {/* Card */}
        <div className="bg-[#111113] rounded-2xl border border-[#27272a]/80 p-8 shadow-2xl shadow-black/40">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-[#fafafa] tracking-tight">Create account</h1>
            <p className="text-[13px] text-[#71717a] mt-1">Start managing your projects</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg mb-5 text-[13px] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-[14px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all text-[14px] shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#27272a]/60 text-center">
            <p className="text-[13px] text-[#71717a]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
