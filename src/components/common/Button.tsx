import { forwardRef } from 'react'
import { Button as BaseButton, type ButtonProps as BaseButtonProps } from '@/components/ui/button'
import { Spinner } from './Spinner'

export interface ButtonProps extends BaseButtonProps {
  loading?: boolean
}

/** App-wide button: adds a loading spinner + disabled-while-pending on top of the shadcn primitive. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading = false, disabled, asChild, children, ...props }, ref) => {
    // Radix's Slot (asChild) requires exactly one child — never inject the spinner alongside it.
    if (asChild) {
      return (
        <BaseButton ref={ref} asChild disabled={disabled} {...props}>
          {children}
        </BaseButton>
      )
    }

    return (
      <BaseButton ref={ref} disabled={disabled || loading} aria-busy={loading} {...props}>
        {loading && <Spinner label="Submitting" />}
        {children}
      </BaseButton>
    )
  },
)
Button.displayName = 'Button'
