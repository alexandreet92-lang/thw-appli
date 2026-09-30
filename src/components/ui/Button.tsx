'use client'

import { motion } from 'motion/react'
import { Button as ShadButton } from '@/components/shadcn/button'
import { useI18n } from '@/lib/i18n'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

// Enveloppe historique (API inchangée) → rendu shadcn/ui, pilule du design system.
const VARIANT = { primary: 'default', secondary: 'secondary', ghost: 'ghost', destructive: 'destructive' } as const
const SIZE = { sm: 'sm', md: 'default', lg: 'lg' } as const

// Pulsing dots used in loading state — no spinner
function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const { t } = useI18n()
  return (
    <ShadButton variant={VARIANT[variant]} size={SIZE[size]} disabled={disabled || loading} className={className} {...props}>
      {loading ? (<><LoadingDots /><span>{t('ui.loading')}</span></>) : children}
    </ShadButton>
  )
}
