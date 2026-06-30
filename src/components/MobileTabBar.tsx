'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays, BarChart3, Grid3x3, ChevronLeft,
  ClipboardList, Calendar, Dumbbell, HeartPulse,
  Activity, Moon, Apple, Trophy,
  Link as LinkIcon, FileText, User, Settings,
} from 'lucide-react'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Types & constants ──────────────────────────────────────────

type Mode = 'main' | 'plan' | 'stats' | 'plus'

const ACCENT = '#06B6D4'
const DIM    = '#9CA3AF'

const ROUTE_TO_TAB: Record<string, Exclude<Mode, 'main'>> = {
  '/planning': 'plan',    '/calendar': 'plan',     '/session': 'plan',  '/injuries': 'plan',
  '/activities': 'stats', '/recovery': 'stats',    '/nutrition': 'stats', '/performance': 'stats',
  '/connections': 'plus', '/briefing': 'plus',     '/profile': 'plus',  '/parametres': 'plus',
}

type Sub = { href: string; label: string; Icon: LucideIcon }

const SUBS: Record<Exclude<Mode, 'main'>, Sub[]> = {
  plan: [
    { href: '/planning',  label: 'Planning',   Icon: ClipboardList },
    { href: '/calendar',  label: 'Calendar',   Icon: Calendar },
    { href: '/session',   label: 'Session',    Icon: Dumbbell },
    { href: '/injuries',  label: 'Blessures',  Icon: HeartPulse },
  ],
  stats: [
    { href: '/activities',  label: 'Training',  Icon: Activity },
    { href: '/recovery',    label: 'Récup',     Icon: Moon },
    { href: '/nutrition',   label: 'Nutrition', Icon: Apple },
    { href: '/performance', label: 'Perf',      Icon: Trophy },
  ],
  plus: [
    { href: '/connections', label: 'Connexions', Icon: LinkIcon },
    { href: '/briefing',    label: 'Briefing',   Icon: FileText },
    { href: '/profile',     label: 'Profil',     Icon: User },
    { href: '/parametres',  label: 'Réglages',   Icon: Settings },
  ],
}

// ── Sub-item component ─────────────────────────────────────────

function SubItem({ href, label, Icon, active }: Sub & { active: boolean }) {
  // « Mon Profil » s'ouvre en sur-page (par-dessus la page courante), pas en route.
  if (href === '/profile') {
    return (
      <button onClick={() => window.dispatchEvent(new Event('thw:open-profile'))} style={{ ...BTN, background: 'none', border: 'none', cursor: 'pointer' }}>
        <Icon size={20} color={active ? ACCENT : DIM} />
        <span style={lbl(active)}>{label}</span>
      </button>
    )
  }
  return (
    <Link href={href} style={{ ...BTN, textDecoration: 'none' }}>
      <Icon size={20} color={active ? ACCENT : DIM} />
      <span style={lbl(active)}>{label}</span>
    </Link>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function MobileTabBar() {
  const pathname              = usePathname()
  const router                = useRouter()
  const [mode, setMode]       = useState<Mode>('main')
  const [exiting, setExiting] = useState(false)
  const [aiOpen, setAiOpen]   = useState(false)
  const [hidden, setHidden]   = useState(false)

  // Prefetch all main routes so navigation is instant
  useEffect(() => {
    const routes = [
      '/',
      '/planning', '/calendar', '/session', '/injuries',
      '/activities', '/recovery', '/nutrition', '/performance',
      '/connections', '/briefing', '/profile', '/parametres',
      '/record',
    ]
    routes.forEach(r => router.prefetch(r))
  }, [router])

  // Hide when software keyboard pushes viewport up
  useEffect(() => {
    const vv   = window.visualViewport
    const base = vv?.height ?? window.innerHeight
    const check = () => setHidden((vv?.height ?? window.innerHeight) < base * 0.8)
    vv?.addEventListener('resize', check)
    window.addEventListener('resize', check)
    return () => {
      vv?.removeEventListener('resize', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  // Return to main on route change
  useEffect(() => { setMode('main') }, [pathname])

  function switchTo(next: Mode) {
    if (next === mode) return
    setExiting(true)
    setTimeout(() => { setMode(next); setExiting(false) }, 180)
  }

  // NB : `hidden` (clavier logiciel) ne doit PAS court-circuiter le rendu ici,
  // sinon l'AIPanel (enfant) se démonte quand le clavier s'ouvre → il se referme,
  // le clavier disparaît, il se remonte/rouvre… boucle infinie. On masque
  // uniquement la barre <nav> plus bas, en gardant l'AIPanel monté.
  // Page /record : compteur immersif, on cache la navbar
  if (pathname === '/record') return null
  // Page /competences : header + champ dédiés, on masque la tabbar
  if (pathname?.startsWith('/competences')) return null
  // Page /topup : standalone (lien email)
  if (pathname?.startsWith('/topup')) return null
  // Pages d'entrée (connexion, onboarding…) : pas de barre d'onglets
  if (isFullscreenRoute(pathname)) return null

  const activeTab = ROUTE_TO_TAB[pathname]
  const col       = (on: boolean) => on ? ACCENT : DIM

  const isSubMode = mode !== 'main'

  return (
    <>
      {!hidden && (
      <nav className="mobile-tab-bar md:hidden" style={BAR}>
        <div style={{
          display: 'flex', width: '100%', height: 64, alignItems: 'center',
          opacity:   exiting ? 0 : 1,
          transform: exiting ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}>

          {isSubMode ? (
            /* ── Sub-pages ──────────────────────────────────── */
            <>
              <button onClick={() => switchTo('main')} style={{ ...BTN, flex: '0 0 48px' as unknown as number }}>
                <ChevronLeft size={24} color={DIM} />
              </button>
              {SUBS[mode as Exclude<Mode, 'main'>].map(s => (
                <SubItem key={s.href} {...s} active={pathname === s.href} />
              ))}
            </>
          ) : (
            /* ── Main 5 tabs ────────────────────────────────── */
            <>
              {/* Plan */}
              <button onClick={() => switchTo('plan')} style={BTN}>
                <CalendarDays size={22} color={col(activeTab === 'plan')} />
                <span style={lbl(activeTab === 'plan')}>Plan</span>
              </button>

              {/* Stats */}
              <button onClick={() => switchTo('stats')} style={BTN}>
                <BarChart3 size={22} color={col(activeTab === 'stats')} />
                <span style={lbl(activeTab === 'stats')}>Stats</span>
              </button>

              {/* Record — centre, protrudes above bar */}
              <div style={{ flex: 1, position: 'relative', height: 64 }}>
                <Link href="/record" style={RECORD_BTN}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <circle cx="13" cy="13" r="11" stroke="white" strokeWidth="1.5" />
                    <circle cx="13" cy="13" r="6"  fill="white" />
                  </svg>
                </Link>
              </div>

              {/* Plus */}
              <button onClick={() => switchTo('plus')} style={BTN}>
                <Grid3x3 size={22} color={col(activeTab === 'plus')} />
                <span style={lbl(activeTab === 'plus')}>Plus</span>
              </button>

              {/* IA */}
              <button onClick={() => setAiOpen(o => !o)} style={BTN}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/logo_4bras.png"
                  alt="Coach IA"
                  width={24} height={24}
                  style={{ objectFit: 'contain' }}
                />
              </button>
            </>
          )}

        </div>
      </nav>
      )}

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialAgent="planning" />
    </>
  )
}

// ── Static styles ──────────────────────────────────────────────

const BAR: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
  background: 'var(--nav-bg)',
  borderTop: '0.5px solid var(--nav-border)',
  paddingBottom: 'env(safe-area-inset-bottom)',
}

const BTN: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 3,
  height: 64, padding: '4px 0',
  border: 'none', background: 'transparent', cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

const lbl = (on: boolean): React.CSSProperties => ({
  fontSize: 10, lineHeight: 1,
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: on ? 600 : 400,
  color: on ? ACCENT : DIM,
})

// Protrudes 16px above bar: bottom=24 → top=24+56=80 → bar=64 → protrusion=16
const RECORD_BTN: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 56, height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #06B6D4, #5b6fff)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  textDecoration: 'none',
}
