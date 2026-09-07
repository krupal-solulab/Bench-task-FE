import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}

export interface StaggerContainerProps {
  children: ReactNode
  className?: string
}

/** Wrap a grid/list of cards to fade+rise them in with a small stagger between siblings. */
export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: StaggerContainerProps) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}
