import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton rounded-md', className)} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[#111113] rounded-xl border border-[#27272a]/60 p-5">
      <div className="p-2 bg-[#18181b] rounded-lg w-fit mb-3 border border-[#27272a]/40">
        <Skeleton className="w-5 h-5" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <Skeleton className="h-1.5 w-full rounded-full mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#111113] rounded-xl p-4 border border-[#27272a]/60">
      <Skeleton className="w-8 h-8 rounded-lg mb-3" />
      <Skeleton className="h-7 w-12 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#27272a]/40">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-16 rounded" />
      <Skeleton className="h-5 w-14 rounded" />
      <Skeleton className="w-6 h-6 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-[#111113] rounded-xl border border-[#27272a]/60 p-5">
      <div className="p-2 bg-[#18181b] rounded-lg w-fit mb-3 border border-[#27272a]/40">
        <Skeleton className="w-5 h-5" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3 mb-4" />
      <Skeleton className="h-1.5 w-full rounded-full mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72 bg-[#111113]/60 rounded-xl border border-[#27272a]/60">
      <div className="p-3.5 border-b border-[#27272a]/40">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-5 rounded-full" />
        </div>
      </div>
      <div className="p-2.5 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#18181b] rounded-lg p-3.5 border border-[#27272a]/40">
            <div className="flex items-center gap-2 mb-2.5">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-1.5" />
            <Skeleton className="h-3 w-full mb-3" />
            <div className="flex items-center justify-between pt-2.5 border-t border-[#27272a]/30">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
