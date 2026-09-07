import { forwardRef } from 'react'
import { Button as BaseButton, type ButtonProps as BaseButtonProps } from '@/components/ui/button'
import { Spinner } from './Spinner'

export interface ButtonProps extends BaseButtonProps {
  loading?: boolean
}

/** App-wide button: adds a loading spinner + disabled-while-pending on top of the shadcn primitive. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading = false, disabled, children, ...props }, ref) => (
    <BaseButton ref={ref} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <Spinner label="Submitting" />}
      {children}
    </BaseButton>
  ),
)
Button.displayName = 'Button'
