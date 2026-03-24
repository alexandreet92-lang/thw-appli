'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/planning',
    label: 'Planning',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: '/sessions',
    label: 'Session Builder',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: '/data',
    label: 'Données',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-6 4 4 4-8"/>
      </svg>
    ),
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    href: '/recovery',
    label: 'Récupération',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  {
    href: '/athletes',
    label: 'Athlètes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'group relative w-full h-11',
        'flex items-center justify-center rounded-[11px]',
        'transition-all duration-150',
        isActive
          ? 'bg-[rgba(0,200,224,0.10)] text-brand'
          : 'text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
      )}
    >
      {isActive && (
        <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-full shadow-brand-sm" />
      )}
      <span className="w-[18px] h-[18px]">{icon}</span>
      <span className={cn(
        'absolute left-[calc(100%+12px)] z-50 whitespace-nowrap',
        'bg-[var(--bg-card)] border border-[var(--border-mid)]',
        'text-[var(--text)] text-xs px-2.5 py-1.5 rounded-[7px] shadow-panel',
        'opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150'
      )}>
        {label}
      </span>
    </Link>
  )
}

export function Sidebar() {
  const { mode, toggleTheme, label } = useTheme()

  return (
    <aside className={cn(
      'w-[72px] h-screen flex-shrink-0 flex flex-col items-center py-5',
      'bg-[var(--nav-bg)] border-r border-[var(--nav-border)]',
      'backdrop-blur-xl shadow-panel relative z-20',
      'transition-colors duration-500'
    )}>
      <Link
        href="/dashboard"
        className={cn(
          'w-10 h-10 rounded-[11px] mb-8 flex-shrink-0',
          'flex items-center justify-center',
          'font-display font-bold text-[12px] text-white tracking-tight',
          'bg-gradient-to-br from-brand to-brand-purple shadow-brand',
          'transition-all hover:scale-105'
        )}
      >
        THW
      </Link>

      <nav className="flex flex-col gap-1 flex-1 w-full px-2.5">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 w-full px-2.5">
        <button
          onClick={toggleTheme}
          title={label}
          className={cn(
            'group relative w-full h-11',
            'flex items-center justify-center rounded-[11px]',
            'text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-brand',
            'transition-all duration-150'
          )}
        >
          {mode === 'dark' ? (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
          <span className={cn(
            'absolute left-[calc(100%+12px)] z-50 whitespace-nowrap',
            'bg-[var(--bg-card)] border border-[var(--border-mid)]',
            'text-[var(--text)] text-xs px-2.5 py-1.5 rounded-[7px] shadow-panel',
            'opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity'
          )}>
            {label}
          </span>
        </button>

        <NavLink
          href="/profile"
          label="Mon profil"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          }
        />
      </div>
    </aside>
  )
}
