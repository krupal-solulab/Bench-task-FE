import { useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/cn'

export interface OverflowTab {
  value: string
  label: string
}

export interface OverflowTabsListProps {
  tabs: OverflowTab[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

// Must match TabsTrigger's horizontal metrics so the hidden measuring row sizes like the real one.
const TAB_MEASURE_CLASS = 'shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium'
const LIST_PADDING_X = 8 // TabsList's p-1, both sides
const MORE_ICON_WIDTH = 20 // chevron + gap

/**
 * A tab bar that never scrolls: tabs that fit stay inline, the rest move into a "More" menu
 * (re-measured on resize). When the active tab is one of the overflowed ones, the More button
 * takes its name and the active styling, so the current view is always visible in the bar.
 * Must be rendered inside a Radix `<Tabs>`.
 */
export function OverflowTabsList({ tabs, value, onValueChange, className }: OverflowTabsListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(tabs.length)

  const activeLabel = tabs.find((t) => t.value === value)?.label ?? ''

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    function recompute() {
      const spans = Array.from(measure!.children) as HTMLElement[]
      // Last two measuring spans are the "More" label and the active-tab label (for the button).
      const tabWidths = spans.slice(0, tabs.length).map((s) => s.offsetWidth)
      const moreWidth =
        Math.max(spans[tabs.length]?.offsetWidth ?? 0, spans[tabs.length + 1]?.offsetWidth ?? 0) +
        MORE_ICON_WIDTH
      const available = container!.clientWidth - LIST_PADDING_X
      const total = tabWidths.reduce((a, b) => a + b, 0)

      // No layout (jsdom) or everything fits: show all tabs, no menu.
      if (available <= 0 || total <= available) {
        setVisibleCount(tabs.length)
        return
      }
      let used = moreWidth
      let count = 0
      while (count < tabWidths.length && used + tabWidths[count]! <= available) {
        used += tabWidths[count]!
        count++
      }
      setVisibleCount(count)
    }

    recompute()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', recompute)
      return () => window.removeEventListener('resize', recompute)
    }
    const observer = new ResizeObserver(recompute)
    observer.observe(container)
    return () => observer.disconnect()
  }, [tabs, activeLabel])

  const visible = tabs.slice(0, visibleCount)
  const overflow = tabs.slice(visibleCount)
  const activeInOverflow = overflow.some((t) => t.value === value)

  return (
    <div ref={containerRef} className={cn('relative min-w-0 flex-1', className)}>
      {/* Clipped so the full-width measuring row never widens the page itself. */}
      <div aria-hidden className="pointer-events-none invisible absolute inset-0 overflow-hidden">
        <div ref={measureRef} className="flex w-max">
          {tabs.map((t) => (
            <span key={t.value} className={TAB_MEASURE_CLASS}>
              {t.label}
            </span>
          ))}
          <span className={TAB_MEASURE_CLASS}>More</span>
          <span className={TAB_MEASURE_CLASS}>{activeLabel}</span>
        </div>
      </div>

      <TabsList className="overflow-hidden">
        {visible.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
                'ring-offset-background transition-all hover:text-foreground focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeInOverflow && 'bg-background text-foreground shadow-sm',
              )}
            >
              {activeInOverflow ? activeLabel : 'More'}
              <ChevronDown className="h-4 w-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              {overflow.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  onSelect={() => onValueChange(t.value)}
                  className={cn('gap-2', t.value === value && 'font-medium text-foreground')}
                >
                  <Check className={cn('h-4 w-4', t.value !== value && 'invisible')} aria-hidden />
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TabsList>
    </div>
  )
}
