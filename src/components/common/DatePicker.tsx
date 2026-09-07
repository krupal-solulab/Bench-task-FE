import { Input } from '@/components/ui/input'

export interface DatePickerProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  id?: string
  label?: string
  min?: string
  max?: string
  className?: string
}

/**
 * Wraps the native date input rather than a JS calendar widget — free keyboard support and
 * platform-consistent affordances, at the cost of styling control across browsers.
 */
export function DatePicker({ value, onChange, id, label, min, max, className }: DatePickerProps) {
  return (
    <Input
      id={id}
      type="date"
      aria-label={label}
      value={value ?? ''}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    />
  )
}
