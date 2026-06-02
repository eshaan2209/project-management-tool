import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colors = [
  'bg-violet-500/80 text-violet-100',
  'bg-blue-500/80 text-blue-100',
  'bg-emerald-500/80 text-emerald-100',
  'bg-amber-500/80 text-amber-100',
  'bg-rose-500/80 text-rose-100',
  'bg-cyan-500/80 text-cyan-100',
  'bg-indigo-500/80 text-indigo-100',
  'bg-pink-500/80 text-pink-100',
]

function getColor(name?: string) {
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn('rounded-full object-cover ring-2 ring-[#111113]', sizeClasses[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium ring-2 ring-[#111113] shrink-0',
        getColor(name),
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
