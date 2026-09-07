import { motion } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">You don't have permission to view this page</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your role doesn't grant access to this section. Contact an administrator if you believe
          this is a mistake.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </motion.div>
    </div>
  )
}
