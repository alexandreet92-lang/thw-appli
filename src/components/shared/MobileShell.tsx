'use client'
// Chrome mobile « effet Claude » : la sidebar est fixe EN DESSOUS, c'est la PAGE qui
// glisse vers la droite par-dessus (coins arrondis + ombre). Header flottant (menu +
// shuriken IA). Gestes au doigt (drag + snap) pilotés en refs (transform, 60 fps).
// MOBILE UNIQUEMENT — le desktop n'est pas concerné (rendu via layout, branche md:hidden).
import { haptic as hapticNative } from '@/lib/haptics'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/shared/Sidebar'
import { CoachSidebarContent } from '@/components/coach/CoachSidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import { MobileSectionTabs } from '@/components/nav/MobileSectionTabs'
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

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
const FD = 'var(--font-display)'
const MOTION = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.42s, box-shadow 0.42s'
const OPEN_RATIO = 0.80
const OPEN_MAX = 360

// Cherche un ancêtre défilable horizontalement (tableau large, carrousel…) entre
// l'élément touché et la page, pour NE PAS ouvrir le menu latéral quand on fait
// défiler un tableau vers la gauche/droite.
function hScrollAncestor(node: EventTarget | null, stop: HTMLElement | null): HTMLElement | null {
  let el = node as HTMLElement | null
  while (el && el !== stop) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return el
    }
    el = el.parentElement
  }
  return null
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const { profile } = useProfile()
  const coachAccess = useCoachAccess()   // owner / payant / essai 14 j
  const [open, setOpen] = useState(false)
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
  useEffect(() => {
    const h = (e: Event) => setImmersive(!!(e as CustomEvent).detail)
    window.addEventListener('thw:immersive', h as EventListener)
    return () => window.removeEventListener('thw:immersive', h as EventListener)
  }, [])
  const unreadNotifs = useUnreadNotifCount(notifOpen)
  useNotificationGenerators()
  const [reduce, setReduce] = useState(false)
  // La sidebar mobile n'existe plus que dans l'espace coach.
  const isCoach = !!pathname?.startsWith('/coach')
  const panelRef = useRef<HTMLDivElement>(null)
  const g = useRef({ active: false, dragging: false, startX: 0, startY: 0, base: 0, last: 0, hscroll: null as HTMLElement | null, hswipe: false, past: false, vx: 0, lx: 0, lt: 0 })

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches); f(); m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
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
    const open = () => { setOpen(false); setProfileOpen(true) }
    window.addEventListener('thw:open-profile', open)
    return () => window.removeEventListener('thw:open-profile', open)
  }, [])
  // On replie la sur-page profil à chaque navigation.
  useEffect(() => { setProfileOpen(false) }, [pathname])
  // Réglages coach ouverts en sur-page (clic sur l'avatar de la sidebar coach).
  useEffect(() => {
    const open = () => { if (window.innerWidth < 768) { setOpen(false); setCoachSettingsOpen(true) } }
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
    const open = () => { if (window.innerWidth < 768) { setOpen(false); setFeedbackOpen(true) } }
    window.addEventListener('thw:open-feedback', open)
    return () => window.removeEventListener('thw:open-feedback', open)
  }, [])
  useEffect(() => {
    document.body.classList.toggle('drawer-open', open)
    return () => document.body.classList.remove('drawer-open')
  }, [open])

  function offsetPx() { return Math.min(window.innerWidth * OPEN_RATIO, OPEN_MAX) }
  // Pendant le drag : on peint via ref (transform direct, 60 fps, pas de setState/frame).
  // La page se recule légèrement (scale) → effet « carte » façon Claude (révèle un
  // liseré de sidebar en haut et en bas), coins arrondis, ombre douce et diffuse.
  function paint(x: number) {
    const el = panelRef.current; if (!el) return
    const r = Math.max(0, Math.min(1, x / offsetPx()))
    el.style.transform = `translateX(${x}px) scale(${(1 - 0.035 * r).toFixed(4)})`
    const on = x > 4
    el.style.borderRadius = on ? '26px' : '0px'
    el.style.boxShadow = on ? '-8px 0 48px rgba(0,0,0,0.12)' : 'none'
  }
  // Fin de geste / tap : on rétablit la transition + on peint la cible (anime depuis la
  // position courante), puis l'état React reprend la main (style cohérent avec `open`).
  function settle(next: boolean) {
    const el = panelRef.current
    if (el) { el.style.transition = reduce ? 'none' : MOTION; void el.offsetWidth; paint(next ? offsetPx() : 0) }
    setOpen(next)
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    const st = g.current
    st.startX = t.clientX; st.startY = t.clientY; st.dragging = false; st.past = false; st.vx = 0; st.lx = t.clientX; st.lt = Date.now()
    // Feuilles / modales (portails hors de la page) : leur geste ne doit JAMAIS
    // ouvrir la sidebar — React remonte pourtant l'événement jusqu'ici.
    if (!panelRef.current?.contains(e.target as Node)) { st.active = false; return }
    // Interface athlète : plus de sidebar sur mobile (navigation par la barre du bas).
    if (!isCoach) { st.active = false; return }
    st.base = open ? offsetPx() : 0; st.last = st.base
    // Sur la page d'enregistrement (carte plein écran), on NE glisse JAMAIS la
    // sidebar : le doigt sert à déplacer la carte. On n'amorce pas le geste.
    if (pathname === '/record' && !open) { st.active = false; return }
    st.active = true // façon Claude : on peut amorcer le glissement depuis n'importe où
    // Tableau/carrousel défilable sous le doigt → on le mémorise pour lui laisser
    // le scroll horizontal (ne pas ouvrir le menu latéral).
    st.hscroll = hScrollAncestor(e.target, panelRef.current)
    // Zone à swipe horizontal MANUEL (ex. barre des jours Nutrition) : on ne doit
    // JAMAIS y ouvrir le menu latéral, même si ce n'est pas un scroller natif.
    st.hswipe = !!(e.target as HTMLElement | null)?.closest?.('[data-hswipe]')
  }
  function onTouchMove(e: React.TouchEvent) {
    const st = g.current; if (!st.active) return
    const t = e.touches[0]; const dx = t.clientX - st.startX; const dy = t.clientY - st.startY
    if (!st.dragging) {
      if (Math.abs(dx) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) { st.active = false; return } // scroll vertical
      // Geste horizontal dans une zone à swipe manuel (barre des jours) → on cède
      // toujours : ce geste lui appartient, jamais d'ouverture de la sidebar.
      if (st.hswipe) { st.active = false; return }
      // Défilement horizontal d'un tableau : si le conteneur peut encore défiler
      // dans ce sens, on lui cède le geste (pas d'ouverture de la sidebar).
      const hs = st.hscroll
      if (hs) {
        const canRight = hs.scrollLeft < hs.scrollWidth - hs.clientWidth - 1 // doigt vers la gauche
        const canLeft  = hs.scrollLeft > 1                                   // doigt vers la droite
        if ((dx < 0 && canRight) || (dx > 0 && canLeft)) { st.active = false; return }
      }
      st.dragging = true
      if (panelRef.current) panelRef.current.style.transition = 'none'
    }
    const x = Math.max(0, Math.min(offsetPx(), st.base + dx))
    const now = Date.now()
    if (now > st.lt) st.vx = (t.clientX - st.lx) / (now - st.lt)
    st.lx = t.clientX; st.lt = now
    st.last = x; paint(x)
    // Légère vibration quand le geste franchit le seuil d'ouverture (et au retour).
    const past = x > offsetPx() * 0.12
    if (past !== st.past) { st.past = past; hapticNative('light') }
  }
  function onTouchEnd() {
    const st = g.current; if (!st.dragging) { st.active = false; return }
    st.dragging = false; st.active = false
    // Un petit geste suffit (façon Claude) : un flick rapide décide seul dans son
    // sens ; sinon ~12 % de la largeur pour ouvrir, ~88 % restant pour fermer.
    let next: boolean
    if (Math.abs(st.vx) > 0.3) next = st.vx > 0
    else if (st.base === 0) next = st.last > offsetPx() * 0.12
    else next = st.last > offsetPx() * 0.88
    settle(next)
  }

  // /topup : page autonome (lien email), aucun chrome.
  if (pathname?.startsWith('/topup')) return <>{children}</>
  // Pages d'entrée (connexion, onboarding…) : plein écran, sans chrome.
  if (isFullscreenRoute(pathname)) {
    return <div className="md:hidden" style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)' }}><PageTransition>{children}</PageTransition></div>
  }
  const hideHeader = pathname?.startsWith('/competences') || immersive
  // Page « lancer une activité » : carte plein écran (pas de gap haut), pas de
  // bouton IA ni notifications — seulement le hamburger. Boutons flottants
  // pleins (blanc le jour / noir la nuit) via les tokens --bg / --text.
  const isRecord = pathname === '/record'

  // En-tête sidebar coach : « Hybrid » + type d'interface (cyan) + avatar qui
  // ouvre les réglages coach.
  const coachHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px 14px', flexShrink: 0 }}>
      <div>
        <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.05 }}>Hybrid</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>{t('shared.interfaceCoach')}</div>
      </div>
      <button onClick={() => { setOpen(false); setCoachSettingsOpen(true) }} aria-label={t('shared.coachSettings')} style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <Avatar url={profile?.avatar_url ?? null} name={profile?.full_name ?? null} size={38} />
      </button>
    </div>
  )

  // Boutons flottants : fond PLEIN (couleur de carte), SANS backdrop-filter.
  // Le flou « verre dépoli » (backdrop-filter) est bogué dans la WebView iOS :
  // il s'affiche par intermittence (« des fois ça marche, des fois pas »). Un
  // fond plein est 100 % constant → plus de clignotement, boutons toujours nets.
  const fab: React.CSSProperties = {
    position: 'absolute', top: 'calc(env(safe-area-inset-top) + 7px)', width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
    background: 'color-mix(in srgb, var(--text) 10%, var(--bg))',
    boxShadow: '0 2px 12px rgba(0,0,0,0.20)', cursor: 'pointer', zIndex: 5, padding: 0, WebkitTransform: 'translateZ(0)',
  }

  return (
    <div className="md:hidden" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar fixe EN DESSOUS — surface douce (bg-card) légèrement relevée du
          fond de page pour adoucir le contraste (moins « noir agressif »). */}
      {isCoach && <aside style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${OPEN_RATIO * 100}%`, maxWidth: 340, zIndex: 1, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
        <CoachSidebarContent headerSlot={coachHeader} onClose={() => setOpen(false)} onOpenAI={() => { setAiOpen(true); setOpen(false) }} />
      </aside>}

      {/* Page qui glisse PAR-DESSUS — transform piloté par l'état (cohérent au re-render) */}
      <div ref={panelRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'var(--bg)', overflow: 'hidden',
          transformOrigin: 'center',
          // Au repos : pas de transform → réactive backdrop-filter (flou) sur iOS.
          transform: open ? `translateX(min(${OPEN_RATIO * 100}vw, ${OPEN_MAX}px)) scale(0.965)` : 'none',
          borderRadius: open ? 26 : 0,
          boxShadow: open ? '-8px 0 48px rgba(0,0,0,0.12)' : 'none',
          transition: reduce ? 'none' : MOTION }}>
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
            <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-bottom) + 60px)', pointerEvents: 'none', zIndex: 4, background: 'linear-gradient(to top, var(--bg) 0%, var(--bg) 55%, transparent 100%)' }} />
          </>}
          {isCoach ? (
            <button aria-label={t('shared.menu')} onClick={() => settle(!open)} className="thw-press" style={{ ...fab, left: 12, flexDirection: 'column', gap: 5 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2 }} />)}
            </button>
          ) : isRecord ? (
            // Page Lancer : retour à la page précédente (la barre d'onglets y est masquée).
            <button aria-label={t('profile.back')} onClick={() => { if (window.history.length > 1) router.back(); else router.push('/') }} className="thw-press" style={{ ...fab, background: 'var(--bg)', left: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          ) : (
            // Réglages (remplace l'ancien menu « 3 traits ») → sur-page Profil & réglages.
            <button aria-label={t('nav.settings')} onClick={() => setProfileOpen(true)} className="thw-press" style={{ ...fab, left: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          {/* Bascule d'interface Athlète ⇄ Coach — réservée au propriétaire de l'espace coach. */}
          {!isRecord && coachAccess.access && (
            <Link href={isCoach ? "/" : "/coach"} aria-label={isCoach ? t('shared.backToApp') : t('shared.coachSpace')} onClick={() => setOpen(false)} className="thw-press"
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
          <button data-guide="app-search" aria-label={t('shared.searchApp')} onClick={() => { setOpen(false); openSearch() }} className="thw-press"
            style={{ ...fab, right: 116 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          {/* Cloche notifications — ouvre une surpage centrée (sans quitter la page) */}
          <button aria-label={t('shared.notifications')} onClick={() => { setOpen(false); setNotifOpen(true) }} className="thw-press"
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

        <main style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], background: 'var(--bg)',
          // Façon Strava : le contenu NET glisse directement sous la barre translucide
          // du haut (le flou de l'overlay le rend lisible sous la barre de statut).
          // Pas de fondu vers le blanc → plus de « bloc blanc » en haut.
          paddingTop: (hideHeader || isRecord) ? 0 : 'calc(env(safe-area-inset-top) + 54px)' }}>
        <TrialEndedModal />
        <PlanActivatedHost />
        {/* Sous-onglets de l'onglet courant (ex. Plan → Planning · Planning Week · Objectifs). */}
        {!isRecord && !isCoach && <MobileSectionTabs />}
        <PageTransition>{children}</PageTransition>
        {/* Espaceur de bas de page : un VRAI élément (jamais rogné par WebKit,
            contrairement à padding-bottom sur un conteneur scrollable) → garantit
            que la barre d'onglets flottante ne cache jamais le dernier contenu. */}
        {!isRecord && <div aria-hidden style={{ height: 'calc(104px + env(safe-area-inset-bottom))', flexShrink: 0 }} />}
        </main>

        {/* Zone visible de la page → tap pour fermer (transparent : aucun grisé) */}
        {open && <div onClick={() => settle(false)} style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'transparent' }} />}
      </div>

      <AIPanel open={aiOpen} onClose={() => { setAiOpen(false); setAiPrefill(undefined) }} initialAgent="planning" prefillMessage={aiPrefill} />
      <NotificationsOverlay open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CoachSettingsSheet open={coachSettingsOpen} onClose={() => setCoachSettingsOpen(false)} />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
