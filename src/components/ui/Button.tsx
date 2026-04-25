'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variants = {
  primary: cn(
    'bg-gradient-to-r from-brand to-brand-purple text-white',
    'shadow-[0_2px_12px_rgba(0,200,224,0.28)]',
    'hover:brightness-110 hover:shadow-[0_4px_20px_rgba(0,200,224,0.35)] hover:-translate-y-px',
    'active:translate-y-0'
  ),
  ghost: cn(
    'bg-[var(--bg-card)] border border-[var(--border-mid)] text-[var(--text-mid)]',
    'hover:border-brand hover:text-brand hover:bg-[rgba(0,200,224,0.06)]'
  ),
  danger: cn(
    'bg-[rgba(255,95,95,0.10)] border border-[rgba(255,95,95,0.2)] text-[#ff5f5f]',
    'hover:bg-[rgba(255,95,95,0.18)]'
  ),
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-[8px]',
  md: 'px-4 py-2 text-[13px] gap-[7px] rounded-btn',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-btn',
}

// Pulsing dots used in loading state — no spinner
function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 4, height: 4,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center font-medium transition-all duration-200 cursor-pointer border-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      whileTap={disabled || loading ? {} : { scale: 0.96 }}
      whileHover={disabled || loading ? {} : { scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? (
        <>
          <LoadingDots />
          <span>Chargement…</span>
        </>
      ) : children}
    </motion.button>
  )
}
