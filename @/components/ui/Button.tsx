import { cn } from '@/src/lib/utils'

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
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center font-medium transition-all duration-200 cursor-pointer border-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Chargement…
        </>
      ) : children}
    </button>
  )
}
