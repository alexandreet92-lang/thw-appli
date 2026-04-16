'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useProfile } from '@/hooks/useProfile'
import { useState, useEffect, useRef } from 'react'

// ── Nav items ──────────────────────────────────────────────────

const NAV = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
        <circle cx="8" cy="15" r="1" fill="currentColor"/>
        <circle cx="12" cy="15" r="1" fill="currentColor"/>
        <circle cx="16" cy="15" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/session',
    label: 'Session',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    href: '/activities',
    label: 'Training',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    href: '/recovery',
    label: 'Récupération',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
        <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
        <path d="M12 8v1M9.17 9.17l.7.7M8 12h1M15 12h1M14.12 9.88l.71-.71"/>
      </svg>
    ),
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/injuries',
    label: 'Blessures',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
  {
    href: '/athletes',
    label: 'Athlètes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

// ── Avatar helper ──────────────────────────────────────────────

function Avatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? 'Avatar'}
        style={{
          width: size, height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '2px solid rgba(0,200,224,0.3)',
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif',
      fontWeight: 700,
      fontSize: size * 0.35,
      color: '#fff',
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  )
}

// ── Nav link ───────────────────────────────────────────────────

function NavItem({
  href, label, icon, active, onClick,
}: {
  href: string; label: string; icon: React.ReactNode
  active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        textDecoration: 'none',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#00c8e0' : 'var(--text-mid)',
        background: active ? 'rgba(0,200,224,0.10)' : 'transparent',
        borderLeft: `3px solid ${active ? '#00c8e0' : 'transparent'}`,
        transition: 'background 0.14s, color 0.14s',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,224,0.06)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-mid)'
        }
      }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6, display: 'flex' }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

// ── Sidebar content (shared desktop + mobile drawer) ───────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { mode, toggleTheme, label } = useTheme()
  const { profile } = useProfile()

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* ── Profile ── */}
      <Link
        href="/profile"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          textDecoration: 'none',
          borderBottom: '1px solid var(--nav-border)',
          flexShrink: 0,
          transition: 'background 0.14s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,224,0.05)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <Avatar
          url={profile?.avatar_url ?? null}
          name={profile?.full_name ?? null}
          size={40}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {profile?.full_name ?? 'Mon profil'}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Athlète
          </div>
        </div>
      </Link>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        padding: '8px 8px',
        gap: 2,
      }}>
        {NAV.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div style={{
        padding: '8px 8px 16px',
        borderTop: '1px solid var(--nav-border)',
        display: 'flex', flexDirection: 'column', gap: 2,
        flexShrink: 0,
      }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-mid)', fontSize: 13,
            fontFamily: 'DM Sans, sans-serif', width: '100%',
            textAlign: 'left',
            transition: 'background 0.14s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,224,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span style={{ flexShrink: 0, opacity: 0.6, display: 'flex' }}>
            {mode === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </span>
          {label}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR EXPORT
// Desktop : statique 240px dans le flux flex du layout
// Mobile  : top bar 56px fixe + drawer CSS-transitionné
// ══════════════════════════════════════════════════════════════

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // Swipe to open/close on mobile
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
      // Swipe right from left edge → open
      if (dx > 55 && dy < 80 && touchStartX.current < 32) setMobileOpen(true)
      // Swipe left → close
      if (dx < -55 && dy < 80) setMobileOpen(false)
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <>
      {/* ════════════════════════════════════════════════════
          DESKTOP — sidebar statique 240px, toujours visible
          Elle s'insère dans le flex row du layout.tsx et
          prend 240px ; la <main> prend le reste (flex:1).
          ════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex"
        style={{
          width: 240,
          flexShrink: 0,
          height: '100vh',
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <SidebarContent />
      </aside>

      {/* ════════════════════════════════════════════════════
          MOBILE — top bar fixe 56px + drawer avec transition
          ════════════════════════════════════════════════════ */}

      {/* Top bar */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 56, zIndex: 50,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        {/* Burger */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text)',
          }}
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          )}
        </button>

        {/* Logo centré */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 10, color: '#fff',
            boxShadow: '0 0 10px rgba(0,200,224,0.3)',
          }}>
            THW
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: 15, color: 'var(--text)',
          }}>
            THW Coaching
          </span>
        </Link>

        {/* Espace droit */}
        <div style={{ width: 36 }} />
      </div>

      {/* Overlay sombre derrière le drawer */}
      <div
        className="md:hidden"
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer — transition CSS, pas de conditional render */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 280, zIndex: 60,
          background: 'var(--nav-bg)',
          boxShadow: mobileOpen ? '4px 0 32px rgba(0,0,0,0.18)' : 'none',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.26s cubic-bezier(0.32,1.06,0.64,1)',
        }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>
    </>
  )
}
