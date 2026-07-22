'use client'
// Chrome desktop : sidebar ANCRÉE à gauche (mécanique push, pas d'overlay) + header
// flottant (☰ repli + shuriken IA). Repli → la sidebar sort, le contenu reprend toute la
// largeur. DESKTOP UNIQUEMENT (rendu via la branche `hidden md:flex`).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useProfile } from '@/hooks/useProfile'
import { SidebarContent, Avatar } from '@/components/shared/Sidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { NotificationsOverlay, useUnreadNotifCount } from '@/components/shared/NotificationsOverlay'
import { useNotificationGenerators } from '@/lib/notifications/useNotificationGenerators'
import { FeedbackSheet } from '@/components/feedback/FeedbackSheet'
import { ProfileModalDesktop } from '@/components/profile/ProfileModalDesktop'
import { useI18n } from '@/lib/i18n'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
const FD = 'var(--font-display)'
const W = 248          // largeur ouverte
const RAIL = 62        // largeur repliée (icônes) — s'ouvre au survol
const SCROLL: React.CSSProperties['WebkitOverflowScrolling'] = 'touch'

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRecord = pathname === '/record'
  const { t } = useI18n()
  const { profile } = useProfile()
  const [railOpen, setRailOpen] = useState(false)   // sidebar principale : survol → ouvre
  const [aiOpen, setAiOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unreadNotifs = useUnreadNotifCount(notifOpen)
  useNotificationGenerators()
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches); f(); m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])

  // Le Dashboard ouvre le chat IA via cet event (réutilise AIPanel, pas de doublon).
  useEffect(() => {
    const open = () => setAiOpen(true)
    window.addEventListener('thw:open-coach', open)
    return () => window.removeEventListener('thw:open-coach', open)
  }, [])

  // « Envoyer un message » (menu latéral) → sur-page feedback.
  // MobileShell et DesktopShell sont montés en même temps et écoutent tous deux
  // cet event : sans ce garde, DEUX BottomSheet (portals sur body) s'empilaient
  // sur mobile → il fallait deux taps pour fermer. On n'ouvre que sur desktop.
  useEffect(() => {
    const open = () => { if (window.innerWidth >= 768) setFeedbackOpen(true) }
    window.addEventListener('thw:open-feedback', open)
    return () => window.removeEventListener('thw:open-feedback', open)
  }, [])

  // « Mon profil » en sur-page centrée (desktop) — MobileShell gère la version
  // mobile (sheet) ; garde viewport pour ne pas ouvrir les deux.
  useEffect(() => {
    const open = () => { if (window.innerWidth >= 768) setProfileOpen(true) }
    window.addEventListener('thw:open-profile', open)
    return () => window.removeEventListener('thw:open-profile', open)
  }, [])

  // /topup : page autonome (lien email), aucun chrome.
  if (pathname?.startsWith('/topup')) {
    return <div className="hidden md:block" style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)' }}>{children}</div>
  }

  // Pages d'entrée (connexion, onboarding…) : plein écran, sans sidebar.
  if (isFullscreenRoute(pathname)) {
    return <div className="hidden md:block" style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)' }}>{children}</div>
  }

  const ease = reduce ? 'none' : '0.3s cubic-bezier(0.4,0,0.2,1)'

  // Avatar à GAUCHE (visible même replié) ; « Hybrid » en fondu à l'ouverture.
  const hybridHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px 12px', flexShrink: 0 }}>
      <button onClick={() => setProfileOpen(true)} aria-label={t('nav.myProfile')} style={{ display: 'flex', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
        <Avatar url={profile?.avatar_url ?? null} name={profile?.full_name ?? null} size={36} />
      </button>
      <span style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)', opacity: railOpen ? 1 : 0, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>Hybrid</span>
    </div>
  )

  const fab: React.CSSProperties = {
    position: 'fixed', top: 12, width: 38, height: 38, zIndex: 120,
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12,
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', cursor: 'pointer', padding: 0,
    transition: reduce ? 'none' : `left ${ease}`,
  }

  return (
    <div className="hidden md:flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar principale : rail d'icônes (RAIL px), s'ouvre AU SURVOL en
          overlay (le contenu ne se recompose pas). Un spacer réserve RAIL px. */}
      {/* zIndex 1000 : la sidebar (au survol) doit passer AU-DESSUS des overlays
          de contenu comme le bandeau bas de la page Démarrer (zIndex 999). */}
      <div style={{ width: RAIL, flexShrink: 0, position: 'relative', zIndex: 1000 }}>
        <aside
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
          style={{
            position: 'absolute', top: 0, left: 0, height: '100vh', overflow: 'hidden',
            width: railOpen ? W : RAIL,
            background: 'var(--bg)', borderRight: '1px solid var(--border)',
            boxShadow: railOpen ? '6px 0 28px rgba(0,0,0,0.14)' : 'none',
            transition: reduce ? 'none' : `width ${ease}, box-shadow ${ease}`,
          }}
        >
          {/* Largeur interne fixe : le contenu ne se comprime pas pendant l'animation */}
          <div style={{ width: W, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SidebarContent headerSlot={hybridHeader} onOpenAI={() => setAiOpen(true)} expanded={railOpen} />
          </div>
        </aside>
      </div>

      {/* Contenu */}
      <main style={{
        flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        position: 'relative', background: 'var(--bg)', scrollBehavior: 'smooth', WebkitOverflowScrolling: SCROLL,
      }}>
        {/* Scrim léger en haut */}
        <div aria-hidden style={{ position: 'fixed', top: 0, left: RAIL, right: 0, height: 62, zIndex: 50, pointerEvents: 'none', background: 'linear-gradient(var(--bg), transparent)' }} />

        {/* Démarrer — accès rapide à l'enregistrement d'une séance, juste à
            gauche de la cloche (CTA plein, se distingue des fabs en verre). */}
        <Link href="/record" aria-label="Démarrer une séance"
          style={{
            position: 'fixed', top: 12, right: 108, height: 38, zIndex: 130,
            display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', borderRadius: 12,
            background: 'var(--primary)', color: 'var(--on-primary)', textDecoration: 'none',
            boxShadow: 'var(--shadow-card)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Démarrer
        </Link>

        {/* Cloche + IA masquées sur /record (immersion carte) : le coin haut-droite
            est réservé au sélecteur de fond de carte + Démarrer, sinon collision. */}
        {!isRecord && (<>
        {/* Cloche notifications — ouvre une surpage centrée (sans quitter la page) */}
        <button aria-label={t('shared.notifications')} onClick={() => setNotifOpen(true)}
          style={{ ...fab, right: 62, left: 'auto' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadNotifs > 0 && (
            <span style={{ position: 'absolute', top: 7, right: 7, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, boxShadow: '0 0 0 2px var(--bg)' }}>
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </button>

        {/* Shuriken IA — droite (asset classique 4 branches, sur verre neutre pour qu'il ressorte) */}
        <button aria-label={t('shared.aiCoach')} onClick={() => setAiOpen(true)}
          style={{ ...fab, right: 16, left: 'auto', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt={t('shared.aiCoach')} style={{ width: 24, height: 24, objectFit: 'contain' }} />
        </button>
        </>)}

        <PageTransition>{children}</PageTransition>
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialAgent="planning" />
      <NotificationsOverlay open={notifOpen} onClose={() => setNotifOpen(false)} />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <ProfileModalDesktop open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
