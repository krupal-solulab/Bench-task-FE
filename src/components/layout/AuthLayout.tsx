import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { APP_NAME } from '@/lib/constants'

export interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Shared shell for Login/Register: branded card centered over a subtle dotted backdrop. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/20 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black 40%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-card-hover"
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-soft">
            {APP_NAME.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {children}

        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      </motion.div>
    </div>
  )
}
