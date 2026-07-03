'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Briefing hook inline (compte d'articles non lus) ───────────

interface BriefingSummary {
  lu: boolean
  unreadCount: number
}

function useBriefingBadge(): BriefingSummary {
  const [summary, setSummary] = useState<BriefingSummary>({ lu: true, unreadCount: 0 })
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/briefing', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const json = await res.json() as {
          briefing: { lu: boolean; content: unknown } | null
        }
        if (cancelled) return
        if (!json.briefing) { setSummary({ lu: true, unreadCount: 0 }); return }
        if (json.briefing.lu) { setSummary({ lu: true, unreadCount: 0 }); return }

        // Compter les articles toutes catégories confondues — supporte
        // les 3 formes de content.categories :
        //   (A) NEW  array  : [{ sous_themes: [{ articles }] }]
        //   (B) OLD  array  : [{ articles: [...] }]
        //   (C) OLD  keyed  : { ia_tech: [...], business: [...] }
        let total = 0
        const content = json.briefing.content
        if (content && typeof content === 'object') {
          const cats = (content as { categories?: unknown }).categories
          if (Array.isArray(cats)) {
            for (const cat of cats) {
              if (!cat || typeof cat !== 'object') continue
              const c = cat as { sous_themes?: unknown; articles?: unknown }
              if (Array.isArray(c.sous_themes)) {
                for (const st of c.sous_themes) {
                  const articles = (st as { articles?: unknown })?.articles
                  if (Array.isArray(articles)) total += articles.length
                }
              } else if (Array.isArray(c.articles)) {
                total += c.articles.length
              }
            }
          } else if (cats && typeof cats === 'object') {
            for (const arr of Object.values(cats as Record<string, unknown>)) {
              if (Array.isArray(arr)) total += arr.length
            }
          }
        }
        setSummary({ lu: false, unreadCount: total > 0 ? total : 1 })
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
    // Re-check quand l'utilisateur navigue (le PATCH de /briefing peut changer l'état)
  }, [pathname])

  return summary
}

// ── Nav items ──────────────────────────────────────────────────

const NAV = [
  {
    href: '/',
    labelKey: 'nav.dashboard',
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
    labelKey: 'nav.planning',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: '/calendar',
    labelKey: 'nav.calendar',
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
    labelKey: 'nav.session',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    href: '/activities',
    labelKey: 'nav.training',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    href: '/recovery',
    labelKey: 'nav.recovery',
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
    labelKey: 'nav.nutrition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    href: '/performance',
    labelKey: 'nav.performance',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/injuries',
    labelKey: 'nav.injuries',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
  {
    href: '/connections',
    labelKey: 'nav.connections',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
]

// ── Avatar helper ──────────────────────────────────────────────

export function Avatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
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
          border: '2px solid rgba(6,182,212,0.3)',
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'linear-gradient(135deg, #06B6D4, #5b6fff)',
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
  function press(el: HTMLElement) {
    el.style.transform = 'scale(0.93)'
    el.style.opacity = '0.75'
  }
  function release(el: HTMLElement) {
    el.style.transform = 'scale(1)'
    el.style.opacity = '1'
  }
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
        color: active ? '#06B6D4' : 'var(--text-mid)',
        background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
        borderLeft: `3px solid ${active ? '#06B6D4' : 'transparent'}`,
        transition: 'background 0.14s, color 0.14s, transform 0.12s ease, opacity 0.12s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-mid)'
        }
        release(e.currentTarget as HTMLElement)
      }}
      onMouseDown={e => press(e.currentTarget as HTMLElement)}
      onMouseUp={e => release(e.currentTarget as HTMLElement)}
      onTouchStart={e => press(e.currentTarget as HTMLElement)}
      onTouchEnd={e => release(e.currentTarget as HTMLElement)}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6, display: 'flex' }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

// ── Sidebar content (shared desktop + mobile drawer) ───────────

export function SidebarContent({ onClose, onOpenAI, headerSlot }: { onClose?: () => void; onOpenAI?: () => void; headerSlot?: React.ReactNode }) {
  const pathname = usePathname()
  const { mode, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { profile } = useProfile()
  const briefing = useBriefingBadge()
  const briefingActive = pathname === '/briefing'

  // Lien Cockpit visible uniquement par l'admin (email = NEXT_PUBLIC_ADMIN_EMAIL).
  // La page /admin reste protégée côté serveur (403) indépendamment de cet affichage.
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    let cancel = false
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!adminEmail) return
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (!cancel) setIsAdmin(!!user?.email && user.email.toLowerCase() === adminEmail.toLowerCase())
    })()
    return () => { cancel = true }
  }, [])

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* ── En-tête (override possible : ex. « Hybrid » + avatar mobile) ── */}
      {headerSlot !== undefined ? headerSlot : (
      <Link
        href="/profile"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          textDecoration: 'none',
          borderBottom: '1px solid var(--nav-border)',
          flexShrink: 0,
          transition: 'background 0.14s, transform 0.12s ease, opacity 0.12s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.05)' }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.opacity = '1'
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)'
          ;(e.currentTarget as HTMLElement).style.opacity = '0.75'
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.opacity = '1'
        }}
        onTouchStart={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)'
          ;(e.currentTarget as HTMLElement).style.opacity = '0.75'
        }}
        onTouchEnd={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.opacity = '1'
        }}
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
            {profile?.full_name ?? t('nav.myProfile')}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {t('nav.athlete')}
          </div>
        </div>
      </Link>
      )}

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
            label={t(item.labelKey)}
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
        {/* Cockpit — admin uniquement */}
        {isAdmin && (
          <NavItem
            href="/admin"
            label={t('nav.cockpit')}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M3 18a9 9 0 1 1 18 0"/>
                <path d="M12 18l4-5"/>
                <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/>
              </svg>
            }
            active={pathname === '/admin'}
            onClick={onClose}
          />
        )}
        {/* Candidatures */}
        <NavItem
          href="/questionnaire"
          label={t('nav.applications')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          }
          active={pathname === '/questionnaire'}
          onClick={onClose}
        />
        {/* Briefing du jour */}
        <Link
          href="/briefing"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10,
            textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            fontWeight: briefingActive ? 600 : 400,
            color: briefingActive ? '#06B6D4' : 'var(--text-mid)',
            background: briefingActive ? 'rgba(6,182,212,0.10)' : 'transparent',
            borderLeft: `3px solid ${briefingActive ? '#06B6D4' : 'transparent'}`,
            transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => {
            if (!briefingActive) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }
          }}
          onMouseLeave={e => {
            if (!briefingActive) {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-mid)'
            }
          }}
        >
          <span style={{ flexShrink: 0, opacity: briefingActive ? 1 : 0.6, display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          <span style={{ flex: 1 }}>{t('nav.dailyBriefing')}</span>
          {!briefing.lu && briefing.unreadCount > 0 && (
            <span style={{
              flexShrink: 0,
              minWidth: 18,
              height: 18,
              padding: '0 6px',
              borderRadius: 99,
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {briefing.unreadCount > 99 ? '99+' : briefing.unreadCount}
            </span>
          )}
        </Link>

        {/* ── Bouton Assistant IA ── */}
        {onOpenAI && (
          <button
            onClick={() => { onOpenAI(); onClose?.() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              border: 'none', background: 'transparent', cursor: 'pointer',
              width: '100%', textAlign: 'left',
              transition: 'background 0.14s, opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/logo_4bras.png"
              alt="Assistant IA"
              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, opacity: 0.85 }}
            />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 400,
              background: 'linear-gradient(90deg,#06B6D4,#5b6fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {t('nav.aiAssistant')}
            </span>
          </button>
        )}

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
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)' }}
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
          {t(mode === 'dark' ? 'nav.themeDark' : 'nav.themeLight')}
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
  const [aiOpen, setAiOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { profile } = useProfile()
  const pathname = usePathname()

  // Ferme le drawer mobile à chaque changement de route
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Page /topup : standalone (lien email) — aucun chrome d'app
  if (pathname?.startsWith('/topup')) return null

  return (
    <>
      {/* ════════════════════════════════════════════════════
          DESKTOP — hamburger fixe + sidebar overlay
          Le hamburger (hover → ouvre, click → toggle).
          La sidebar est un overlay fixe qui glisse sur le contenu.
          ════════════════════════════════════════════════════ */}

      {/* Hamburger desktop */}
      <button
        className="hidden md:flex"
        onClick={() => setDesktopOpen(o => !o)}
        onMouseEnter={() => {
          if (window.innerWidth < 768) return
          if (closeTimer.current) clearTimeout(closeTimer.current)
          setDesktopOpen(true)
        }}
        aria-label="Menu"
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 100,
          flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', gap: 5,
          width: 36, height: 36,
          background: 'var(--nav-bg)',
          border: '1px solid var(--nav-border)',
          borderRadius: 8,
          cursor: 'pointer',
          padding: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <span style={{ display: 'block', width: 16, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 16, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 16, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
      </button>

      {/* Overlay backdrop desktop */}
      <div
        className="hidden md:block"
        onClick={() => setDesktopOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 89,
          background: 'rgba(0,0,0,0.25)',
          opacity: desktopOpen ? 1 : 0,
          pointerEvents: desktopOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Desktop sidebar — fixed overlay */}
      <aside
        className="hidden md:flex"
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current)
        }}
        onMouseLeave={() => {
          closeTimer.current = setTimeout(() => setDesktopOpen(false), 250)
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 240,
          height: '100vh',
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 90,
          transform: desktopOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: desktopOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <SidebarContent onOpenAI={() => setAiOpen(o => !o)} />
      </aside>

      {/* ════════════════════════════════════════════════════
          MOBILE — top bar fixe 56px + drawer avec transition
          ════════════════════════════════════════════════════ */}

      {/* Top bar — hamburger | logo | spacer | logo IA | avatar
          (masqué sur /competences : la page a son propre header dédié) */}
      {!pathname?.startsWith('/competences') && (
      <div
        data-app-header=""
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 56, zIndex: 50,
          display: 'flex', alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        {/* Hamburger — gauche */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
          style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', gap: 5,
            width: 36, height: 36,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0,
          }}
        >
          <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--text)', borderRadius: 2 }} />
        </button>

        {/* Logo app */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/logo_app.png"
            alt="THW Coaching"
            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }}
          />
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logo IA — ouvre Coach IA */}
        <button
          onClick={() => setAiOpen(o => !o)}
          aria-label="Coach IA"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/logo_4bras.png"
            alt="Coach IA"
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        </button>

        {/* Avatar */}
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          <Avatar
            url={profile?.avatar_url ?? null}
            name={profile?.full_name ?? null}
            size={32}
          />
        </Link>
      </div>
      )}

      {/* Overlay */}
      <div
        className="md:hidden"
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 59,
          background: 'rgba(0,0,0,0.45)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 280, zIndex: 60,
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <SidebarContent
          onClose={() => setMobileOpen(false)}
          onOpenAI={() => { setAiOpen(o => !o); setMobileOpen(false) }}
        />
      </div>

      {/* ── AIPanel global ── */}
      <AIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        initialAgent="planning"
      />
    </>
  )
}
