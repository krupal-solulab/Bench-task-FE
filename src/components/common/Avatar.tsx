import { Avatar as BaseAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/** Deterministic, pleasant fallback colour per name — same person always gets the same colour. */
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

export interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
} as const

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const hue = nameToHue(name || '?')

  return (
    <BaseAvatar className={cn(SIZE_CLASSES[size], className)} title={name}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback
        className="font-semibold"
        style={{
          backgroundColor: `hsl(${hue} 70% 94%)`,
          color: `hsl(${hue} 55% 38%)`,
        }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </BaseAvatar>
  )
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max)
  const overflow = names.length - visible.length

  return (
    <div className="flex -space-x-2">
      {visible.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size="sm" className="ring-2 ring-background" />
      ))}
      {overflow > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
          +{overflow}
        </span>
      )}
    </div>
  )
}
