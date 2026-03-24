'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useState, useEffect, useRef } from 'react'

const NAV = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: '/sessions',
    label: 'Session Builder',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: '/data',
    label: 'Données',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-6 4 4 4-8"/>
      </svg>
    ),
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    href: '/recovery',
    label: 'Récupération',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  {
    href: '/athletes',
    label: 'Athlètes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { mode, toggleTheme, label } = useTheme()

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <Link
        href="/"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '12px',
          marginBottom: '28px', textDecoration: 'none',
          background: 'linear-gradient(135deg, rgba(0,200,224,0.10), rgba(91,111,255,0.07))',
          border: '1px solid rgba(0,200,224,0.15)',
        }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
          boxShadow: '0 0 16px rgba(0,200,224,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '11px', color: '#fff',
        }}>
          THW
        </div>
        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '14px', color: 'var(--text)', lineHeight: 1.2,
          }}>
            THW Coaching
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
            Coach · Athlète
          </div>
        </div>
      </Link>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {NAV.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '11px',
                textDecoration: 'none', transition: 'all 0.15s',
                background: isActive ? 'rgba(0,200,224,0.10)' : 'transparent',
                color: isActive ? '#00c8e0' : 'var(--text-mid)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #00c8e0' : '3px solid transparent',
              }}
            >
              <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.65 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '8px' }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '11px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-mid)', fontSize: '13.5px',
            fontFamily: 'DM Sans, sans-serif', width: '100%', textAlign: 'left',
          }}
        >
          {mode === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
          {label}
        </button>

        <Link
          href="/profile"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '11px',
            textDecoration: 'none',
            background: pathname === '/profile' ? 'rgba(0,200,224,0.10)' : 'transparent',
            color: pathname === '/profile' ? '#00c8e0' : 'var(--text-mid)',
            fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif',
            borderLeft: pathname === '/profile' ? '3px solid #00c8e0' : '3px solid transparent',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Mon profil
        </Link>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // Swipe gauche→droite pour ouvrir, droite→gauche pour fermer
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)

      // Swipe droite depuis bord gauche → ouvre
      if (dx > 60 && dy < 100 && touchStartX.current < 40) {
        setMobileOpen(true)
      }
      // Swipe gauche → ferme
      if (dx < -60 && dy < 100) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <>
      {/* ══ DESKTOP — toujours visible, jamais fermable ══ */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: '220px',
          height: '100vh',
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          boxShadow: '2px 0 16px rgba(0,0,0,0.06)',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <NavContent />
      </aside>

      {/* ══ MOBILE — barre fixe en haut ══ */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 50, height: '56px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '11px', color: '#fff',
            boxShadow: '0 0 12px rgba(0,200,224,0.3)',
          }}>
            THW
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '15px', color: 'var(--text)',
          }}>
            THW Coaching
          </span>
        </Link>

        {/* Bouton hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '9px', padding: '7px',
            cursor: 'pointer', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          )}
        </button>
      </div>

      {/* ══ MOBILE — drawer avec overlay ══ */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            className="md:hidden"
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: '260px', zIndex: 50,
              background: 'var(--nav-bg)',
              boxShadow: '4px 0 32px rgba(0,0,0,0.15)',
              animation: 'slideIn 0.22s ease',
            }}
          >
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
