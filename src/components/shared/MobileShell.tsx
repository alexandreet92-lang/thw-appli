'use client'
// Chrome mobile : AUCUNE sidebar (athlète comme coach) — navigation par la barre
// d'onglets du bas (MobileTabBar) et boutons ronds flottants en haut (réglages,
// bascule athlète ⇄ coach, recherche, notifications, IA). Geste « retour » depuis
// le bord gauche, piloté en refs (transform, 60 fps).
// MOBILE UNIQUEMENT — le desktop garde sa sidebar (DesktopShell, branche hidden md:block).
import { haptic as hapticNative } from '@/lib/haptics'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PageTransition } from '@/components/ui/PageTransition'
import { MobileSectionTabs } from '@/components/nav/MobileSectionTabs'
import { tabBarShownOn } from '@/components/nav/tabBarRoutes'
import { EntitlementBanner } from '@/components/subscription/EntitlementBanner'
import { UpgradeModalHost } from '@/components/subscription/UpgradeModal'
import { TrialEndedModal } from '@/components/subscription/TrialEndedModal'
import { PlanActivatedHost } from '@/components/subscription/PlanActivatedHost'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { NotificationsOverlay, useUnreadNotifCount } from '@/components/shared/NotificationsOverlay'
import { useGuide } from '@/components/guide/GuideProvider'
import { useNotificationGenerators } from '@/lib/notifications/useNotificationGenerators'
import { ProfileSheet } from '@/components/profile/ProfileSheet'
import { CoachSettingsSheet } from '@/components/coach/CoachSettingsSheet'
import { FeedbackSheet } from '@/components/feedback/FeedbackSheet'
import { haptic } from '@/lib/ui/haptic'
import { useCoachAccess } from '@/hooks/useCoachAccess'
import { useI18n } from '@/lib/i18n'
import { setNavDirection } from '@/lib/nav/direction'
import { useCardEntrance } from '@/components/ui/motion'
import { initKeyboard } from '@/lib/native/keyboard'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
// Pages refaites en « cartes » façon Strava : page grise + cartes blanches (mobile).
const CARD_PAGES = new Set(['/', '/connections', '/planning', '/planning-week', '/calendar', '/recovery', '/nutrition', '/injuries', '/performance', '/session', '/activities'])

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const coachAccess = useCoachAccess()   // owner / payant / essai 14 j
  const [aiOpen, setAiOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { openSearch } = useGuide()
  const [profileOpen, setProfileOpen] = useState(false)
  const [coachSettingsOpen, setCoachSettingsOpen] = useState(false)
  const [aiPrefill, setAiPrefill] = useState<string | undefined>(undefined)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Vue immersive (salon textuel communauté, mobile) : masque TOUT le chrome du
  // haut (hamburger, coach, recherche, notif, IA). Signalé par CommunityView.
  const [immersive, setImmersive] = useState(false)
  // Clavier natif (barre d'accessoire, collage aux champs) : initialisé dès le shell.
  useEffect(() => { initKeyboard() }, [])
  useEffect(() => {
    const h = (e: Event) => setImmersive(!!(e as CustomEvent).detail)
    window.addEventListener('thw:immersive', h as EventListener)
    return () => window.removeEventListener('thw:immersive', h as EventListener)
  }, [])
  const unreadNotifs = useUnreadNotifCount(notifOpen)
  useNotificationGenerators()
  const [reduce, setReduce] = useState(false)
  const isCoach = !!pathname?.startsWith('/coach')
  const panelRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // Cartes des pages : entrée en cascade (fondu + 8 px) au montage uniquement.
  useCardEntrance(mainRef, !!pathname && !pathname.startsWith('/topup') && !isFullscreenRoute(pathname))

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches); f(); m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  // Petite vibration à chaque changement de page (façon Claude). Saute le 1er rendu.
  const firstNav = useRef(true)
  useEffect(() => {
    if (firstNav.current) { firstNav.current = false; return }
    haptic()
  }, [pathname])
  // Le Dashboard / les pages coach ouvrent le chat IA via cet event. Un prompt
  // optionnel (detail.prompt) pré-remplit la barre d'écriture.
  useEffect(() => {
    const open = (e: Event) => {
      const p = (e as CustomEvent).detail?.prompt
      if (typeof p === 'string') setAiPrefill(p)
      setAiOpen(true)
    }
    window.addEventListener('thw:open-coach', open)
    return () => window.removeEventListener('thw:open-coach', open)
  }, [])
  // Le guide peut ouvrir/fermer le chat IA pour le présenter ('ai', 'ai:routines', 'ai:studio').
  useEffect(() => {
    const h = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id ?? null
      if (id && id.startsWith('ai')) setAiOpen(true)
      else if (id === null) setAiOpen(false)
    }
    window.addEventListener('thw:guide-demo', h)
    return () => window.removeEventListener('thw:guide-demo', h)
  }, [])
  // « Mon Profil » ouvert en sur-page (par-dessus la page courante).
  useEffect(() => {
    const open = () => { setProfileOpen(true) }
    window.addEventListener('thw:open-profile', open)
    return () => window.removeEventListener('thw:open-profile', open)
  }, [])
  // On replie la sur-page profil à chaque navigation.
  useEffect(() => { setProfileOpen(false) }, [pathname])
  // Réglages coach ouverts en sur-page (roue crantée en haut à gauche, ou event).
  useEffect(() => {
    const open = () => { if (window.innerWidth < 768) setCoachSettingsOpen(true) }
    window.addEventListener('thw:open-coach-settings', open)
    return () => window.removeEventListener('thw:open-coach-settings', open)
  }, [])
  useEffect(() => { setCoachSettingsOpen(false) }, [pathname])
  // Signale l'ouverture d'un panneau réglages (profil / réglages coach) → la
  // bulle « Mon coach » s'y masque (comme sur l'IA).
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('thw:sheet-open', { detail: profileOpen || coachSettingsOpen })) } catch { /* ignore */ }
  }, [profileOpen, coachSettingsOpen])
  // « Envoyer un message » ouvert en sur-page (depuis le menu Plus / la sidebar).
  useEffect(() => {
    // Garde viewport : DesktopShell écoute aussi cet event (les deux shells sont
    // montés). Sans ça, deux BottomSheet s'empilaient → double tap pour fermer.
    const open = () => { if (window.innerWidth < 768) setFeedbackOpen(true) }
    window.addEventListener('thw:open-feedback', open)
    return () => window.removeEventListener('thw:open-feedback', open)
  }, [])
  // ── Geste retour (athlète ET coach) : glisser depuis le bord gauche vers la droite ──
  // La page suit le doigt ; au-delà du seuil (ou flick) → retour (historique),
  // ce qui referme aussi les vues détail internes (useDetailView).
  const bk = useRef({ on: false, drag: false, x0: 0, y0: 0, dx: 0, vx: 0, lx: 0, lt: 0 })
  function backStart(e: React.TouchEvent) {
    const t = e.touches[0]
    const b = bk.current
    b.on = false; b.drag = false
    if (pathname === '/record' || t.clientX > 24) return
    if (!panelRef.current?.contains(e.target as Node)) return
    if (typeof window !== 'undefined' && window.history.length <= 1) return
    b.on = true; b.x0 = t.clientX; b.y0 = t.clientY; b.dx = 0; b.vx = 0; b.lx = t.clientX; b.lt = Date.now()
  }
  function backMove(e: React.TouchEvent) {
    const b = bk.current; if (!b.on) return
    const t = e.touches[0]; const dx = t.clientX - b.x0; const dy = t.clientY - b.y0
    if (!b.drag) {
      if (dx < 8) { if (Math.abs(dy) > 10) b.on = false; return }
      if (Math.abs(dy) > dx) { b.on = false; return }
      b.drag = true
      if (panelRef.current) panelRef.current.style.transition = 'none'
    }
    const now = Date.now(); if (now > b.lt) b.vx = (t.clientX - b.lx) / (now - b.lt)
    b.lx = t.clientX; b.lt = now; b.dx = Math.max(0, dx)
    if (panelRef.current) panelRef.current.style.transform = `translate3d(${b.dx * 0.9}px,0,0)`
  }
  function backEnd() {
    const b = bk.current; const el = panelRef.current
    if (!b.on || !b.drag) { b.on = false; return }
    b.on = false; b.drag = false
    const go = b.dx > Math.min(110, window.innerWidth * 0.28) || b.vx > 0.45
    if (go) {
      // La transition de page (« back ») prend le relais : on rend la main tout de suite.
      if (el) { el.style.transition = 'none'; el.style.transform = '' }
      hapticNative('light')
      // Vue détail interne (useDetailView) : popstate la referme, pas de changement de route.
      if (!(window.history.state as { thwDetail?: string } | null)?.thwDetail) setNavDirection('back')
      window.history.back()
      return
    }
    if (el) {
      el.style.transition = reduce ? 'none' : 'transform 220ms cubic-bezier(0.32,0.72,0,1)'; el.style.transform = 'translate3d(0,0,0)'
      // Au repos : plus de transform (garde le flou backdrop-filter sur iOS).
      setTimeout(() => { if (!bk.current.drag) { el.style.transition = ''; el.style.transform = '' } }, 240)
    }
  }

  // /topup : page autonome (lien email), aucun chrome.
  if (pathname?.startsWith('/topup')) return <>{children}</>
  // Pages d'entrée (connexion, onboarding…) : plein écran, sans chrome.
  if (isFullscreenRoute(pathname)) {
    return <div className="md:hidden" style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)' }}><PageTransition mobile>{children}</PageTransition></div>
  }
  const hideHeader = pathname?.startsWith('/competences') || immersive
  // Page « lancer une activité » : carte plein écran (pas de gap haut), pas de
  // bouton IA ni notifications — seulement le hamburger. Boutons flottants
  // pleins (blanc le jour / noir la nuit) via les tokens --bg / --text.
  const isRecord = pathname === '/record'
  // Barre d'onglets affichée sur cette route → espace réservé en bas de page
  // (--tabbar-clearance via [data-tabbar-space]) + fondu bas. Sinon : rien.
  const barShown = tabBarShownOn(pathname) && !immersive

  // Boutons flottants : fond PLEIN (couleur de carte), SANS backdrop-filter.
  // Le flou « verre dépoli » (backdrop-filter) est bogué dans la WebView iOS :
  // il s'affiche par intermittence (« des fois ça marche, des fois pas »). Un
  // fond plein est 100 % constant → plus de clignotement, boutons toujours nets.
  const fab: React.CSSProperties = {
    position: 'absolute', top: 'calc(env(safe-area-inset-top) + 7px)', width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
    background: 'var(--float-bg, color-mix(in srgb, var(--text) 10%, var(--bg)))',
    boxShadow: 'var(--shadow-fab)', cursor: 'pointer', zIndex: 5, padding: 0, WebkitTransform: 'translateZ(0)',
  }

  return (
    <div className="md:hidden" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Page — suit le doigt pendant le geste « retour » (transform posé en ref,
          aucun transform au repos : garde le flou backdrop-filter sur iOS). */}
      <div ref={panelRef} onTouchStart={backStart} onTouchMove={backMove} onTouchEnd={backEnd}
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'var(--bg)', overflow: 'hidden',
          // Dashboard : page grise + cartes blanches façon Strava (mode clair) ; surfaces dédiées en sombre.
          ...(CARD_PAGES.has(pathname) ? { '--bg': 'var(--surface-page)', '--dash-card': 'var(--surface-card)', '--dash-chip': 'var(--surface-chip)', '--dash-bar': 'var(--surface-bar)', '--dash-line': 'var(--border)', '--dash-soft': 'var(--surface-soft)' } as React.CSSProperties : null) }}>
        {!hideHeader && <>
          {/* Fondu/flou aux bords haut & bas (façon « Ma vitrine ») : le contenu
              qui défile se floute PROGRESSIVEMENT sous les bulles (haut) et la
              barre d'onglets (bas), au lieu d'être coupé net. Bandes fines (mask
              en dégradé), sous les bulles (z 4 < 5) donc les boutons restent nets.
              pointerEvents:none → n'intercepte aucun tap. */}
          {!isRecord && <>
            {/* Bandes HAUT & BAS — dégradé PLEIN de la couleur de fond → transparent.
                Volontairement SANS backdrop-filter : le flou « verre dépoli » est
                bogué dans la WebView iOS (il s'affiche puis disparaît au défilement).
                Ce dégradé de fond plein est 100 % fiable : plein (jamais see-through)
                sur la zone des boutons/barre d'état, puis fondu doux vers le contenu
                → ne cache pas le contenu plus bas. z 4 < 5 (boutons nets), no tap. */}
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-top) + 56px)', pointerEvents: 'none', zIndex: 4, background: 'linear-gradient(to bottom, var(--bg) 0%, var(--bg) 68%, transparent 100%)' }} />
            {barShown && <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-bottom) + 60px)', pointerEvents: 'none', zIndex: 4, background: 'linear-gradient(to top, var(--bg) 0%, var(--bg) 55%, transparent 100%)' }} />}
          </>}
          {isRecord ? (
            // Page Lancer : retour à la page précédente (la barre d'onglets y est masquée).
            <button aria-label={t('profile.back')} onClick={() => { if (window.history.length > 1) router.back(); else router.push('/') }} className="thw-press" style={{ ...fab, left: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          ) : (
            // Réglages (remplace l'ancien menu « 3 traits ») → sur-page Profil & réglages
            // (athlète) ou Réglages coach (espace coach) — même bouton des deux côtés.
            <button aria-label={isCoach ? t('shared.coachSettings') : t('nav.settings')} onClick={() => (isCoach ? setCoachSettingsOpen(true) : setProfileOpen(true))} className="thw-press" style={{ ...fab, left: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          {/* Bascule d'interface Athlète ⇄ Coach — réservée au propriétaire de l'espace coach.
              Toujours visible DANS l'espace coach : c'est le seul retour vers l'appli athlète. */}
          {!isRecord && (coachAccess.access || isCoach) && (
            <Link href={isCoach ? "/" : "/coach"} aria-label={isCoach ? t('shared.backToApp') : t('shared.coachSpace')} className="thw-press"
              style={{ ...fab, left: 64, textDecoration: 'none',
                background: isCoach ? 'var(--primary)' : (fab.background as string), border: 'none',
                boxShadow: isCoach ? '0 6px 18px rgba(6,182,212,0.34)' : undefined }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isCoach ? '#fff' : 'var(--text)'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </Link>
          )}
          {/* IA + notifications masqués sur /record (immersion carte). */}
          {!isRecord && <>
          {/* Rechercher / Guide — à côté des notifications. */}
          <button data-guide="app-search" aria-label={t('shared.searchApp')} onClick={() => openSearch()} className="thw-press"
            style={{ ...fab, right: 116 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          {/* Cloche notifications — ouvre une surpage centrée (sans quitter la page) */}
          <button aria-label={t('shared.notifications')} onClick={() => setNotifOpen(true)} className="thw-press"
            style={{ ...fab, right: 64 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 'var(--r-sm)', background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, boxShadow: '0 0 0 2px var(--bg)' }}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>
          <button aria-label={t('shared.aiCoach')} data-guide="open-ai" onClick={() => setAiOpen(true)} className="thw-press"
            style={{ ...fab, right: 12, overflow: 'hidden' }}>
            {/* Shuriken Athéna classique 4 branches existant — non redessiné, sur verre neutre */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt={t('shared.aiCoach')} style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </button>
          </>}
        </>}

        <main ref={mainRef} data-card-page={CARD_PAGES.has(pathname) ? '' : undefined} data-tabbar-space={barShown ? '' : undefined} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], background: 'var(--bg)',
          // Façon Strava : le contenu NET glisse directement sous la barre translucide
          // du haut (le flou de l'overlay le rend lisible sous la barre de statut).
          // Pas de fondu vers le blanc → plus de « bloc blanc » en haut.
          paddingTop: (hideHeader || isRecord) ? 0 : 'calc(env(safe-area-inset-top) + 54px)' }}>
        <TrialEndedModal />
        <PlanActivatedHost />
        {/* Sous-onglets de l'onglet courant (ex. Plan → Planning · Planning Week · Objectifs). */}
        {!isRecord && !isCoach && <MobileSectionTabs />}
        {/* L'espace réservé à la barre d'onglets est le DERNIER enfant de la page
            (PageTransition mobile → .thw-tabbar-spacer, hauteur --tabbar-clearance). */}
        <PageTransition mobile>{children}</PageTransition>
        </main>
      </div>

      <AIPanel open={aiOpen} onClose={() => { setAiOpen(false); setAiPrefill(undefined) }} initialAgent="planning" prefillMessage={aiPrefill} />
      <NotificationsOverlay open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CoachSettingsSheet open={coachSettingsOpen} onClose={() => setCoachSettingsOpen(false)} />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
