import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/common/Skeleton'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  isLoading?: boolean
  className?: string
}

export function StatCard({ label, value, icon: Icon, isLoading, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1 text-2xl font-semibold tracking-tight"
        >
          {value}
        </motion.p>
      )}
    </div>
  )
}
