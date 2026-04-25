'use client'

import { motion } from 'framer-motion'

// ── Variants ──────────────────────────────────────────────────────
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0  },
}

const groupVariants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren:   0.04,
    },
  },
}

const itemTransition = {
  duration: 0.32,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
}

// ── Single element reveal on scroll ──────────────────────────────
interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
}

export function ScrollReveal({
  children,
  className,
  style,
  delay = 0,
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-56px' }}
      variants={itemVariants}
      transition={{ ...itemTransition, delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger container — children animate in sequence ─────────────
interface ScrollRevealGroupProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ScrollRevealGroup({
  children,
  className,
  style,
}: ScrollRevealGroupProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-56px' }}
      variants={groupVariants}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger child — must live inside <ScrollRevealGroup> ──────────
export function ScrollRevealItem({
  children,
  className,
  style,
}: ScrollRevealGroupProps) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={itemVariants}
      transition={itemTransition}
    >
      {children}
    </motion.div>
  )
}
