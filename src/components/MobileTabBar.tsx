'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { useI18n } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays, BarChart3, Grid3x3, ChevronLeft,
  ClipboardList, Calendar, Dumbbell, HeartPulse,
  Activity, Moon, Apple, Trophy,
  Link as LinkIcon, FileText, User, Settings, MessageCircle,
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

type Sub = { href: string; labelKey: string; Icon: LucideIcon }

const SUBS: Record<Exclude<Mode, 'main'>, Sub[]> = {
  plan: [
    { href: '/planning',  labelKey: 'nav.planning', Icon: ClipboardList },
    { href: '/calendar',  labelKey: 'nav.calendar', Icon: Calendar },
    { href: '/session',   labelKey: 'nav.session',  Icon: Dumbbell },
    { href: '/injuries',  labelKey: 'nav.injuries', Icon: HeartPulse },
  ],
  stats: [
    { href: '/activities',  labelKey: 'nav.training',      Icon: Activity },
    { href: '/recovery',    labelKey: 'nav.recoveryShort', Icon: Moon },
    { href: '/nutrition',   labelKey: 'nav.nutrition',     Icon: Apple },
    { href: '/performance', labelKey: 'nav.perfShort',     Icon: Trophy },
  ],
  plus: [
    { href: '/connections', labelKey: 'nav.connections', Icon: LinkIcon },
    { href: '/briefing',    labelKey: 'nav.briefing',    Icon: FileText },
    { href: '#feedback',    labelKey: 'nav.feedback',    Icon: MessageCircle },
    { href: '/profile',     labelKey: 'nav.profile',     Icon: User },
    { href: '/parametres',  labelKey: 'nav.settings',    Icon: Settings },
  ],
}

// ── Sub-item component ─────────────────────────────────────────

function SubItem({ href, labelKey, Icon, active }: Sub & { active: boolean }) {
  const { t } = useI18n()
  // « Mon Profil » et « Message » s'ouvrent en sur-page (par-dessus la page courante).
  if (href === '/profile' || href === '#feedback') {
    const evt = href === '/profile' ? 'thw:open-profile' : 'thw:open-feedback'
    return (
      <button onClick={() => window.dispatchEvent(new Event(evt))} style={{ ...BTN, background: 'none', border: 'none', cursor: 'pointer' }}>
        <Icon size={20} color={active ? ACCENT : DIM} />
        <span style={lbl(active)}>{t(labelKey)}</span>
      </button>
    )
  }
  return (
    <Link href={href} style={{ ...BTN, textDecoration: 'none' }}>
      <Icon size={20} color={active ? ACCENT : DIM} />
      <span style={lbl(active)}>{t(labelKey)}</span>
    </Link>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function MobileTabBar() {
  const pathname              = usePathname()
  const router                = useRouter()
  const { t }                 = useI18n()
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
  // Page /profile : réglages plein écran, on masque la barre d'onglets
  if (pathname === '/profile') return null
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
                <span style={lbl(activeTab === 'plan')}>{t('nav.tabPlan')}</span>
              </button>

              {/* Stats */}
              <button onClick={() => switchTo('stats')} style={BTN}>
                <BarChart3 size={22} color={col(activeTab === 'stats')} />
                <span style={lbl(activeTab === 'stats')}>{t('nav.tabStats')}</span>
              </button>

              {/* Record — centre, plat et aligné avec les autres (façon Strava) */}
              <Link href="/record" style={{ ...BTN, textDecoration: 'none' }} aria-label={t('nav.startActivity')}>
                <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                  <circle cx="13" cy="13" r="10" stroke={ACCENT} strokeWidth="1.7" />
                  <circle cx="13" cy="13" r="5"  fill={ACCENT} />
                </svg>
                <span style={lbl(false)}>{t('nav.tabStart')}</span>
              </Link>

              {/* Plus */}
              <button onClick={() => switchTo('plus')} style={BTN}>
                <Grid3x3 size={22} color={col(activeTab === 'plus')} />
                <span style={lbl(activeTab === 'plus')}>{t('nav.tabPlus')}</span>
              </button>

              {/* IA */}
              <button onClick={() => setAiOpen(o => !o)} style={BTN}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/logo_4bras.png"
                  alt={t('nav.coachAI')}
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
  // Barre translucide (verre dépoli) — boutons transparents façon Strava.
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  borderTop: '0.5px solid var(--glass-border)',
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

