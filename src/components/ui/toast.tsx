'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  addToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-2xl shadow-black/40 animate-slide-up min-w-[280px] max-w-[380px] pointer-events-auto border',
              toast.type === 'success' && 'bg-[#111113] border-emerald-500/20 text-emerald-300',
              toast.type === 'error' && 'bg-[#111113] border-red-500/20 text-red-300',
              toast.type === 'info' && 'bg-[#111113] border-blue-500/20 text-blue-300',
            )}
          >
            {toast.type === 'success' && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle size={15} className="text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info size={15} className="text-blue-400 shrink-0" />}
            <p className="text-[13px] flex-1 font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#52525b] hover:text-[#a1a1aa] shrink-0 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
