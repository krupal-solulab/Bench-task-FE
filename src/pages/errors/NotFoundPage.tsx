import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <p className="bg-gradient-to-b from-foreground to-muted-foreground/40 bg-clip-text text-7xl font-bold text-transparent">
          404
        </p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </motion.div>
    </div>
  )
}
