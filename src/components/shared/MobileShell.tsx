'use client'
// Chrome mobile « effet Claude » : la sidebar est fixe EN DESSOUS, c'est la PAGE qui
// glisse vers la droite par-dessus (coins arrondis + ombre). Header flottant (menu +
// shuriken IA). Gestes au doigt (drag + snap) pilotés en refs (transform, 60 fps).
// MOBILE UNIQUEMENT — le desktop n'est pas concerné (rendu via layout, branche md:hidden).
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useProfile } from '@/hooks/useProfile'
import { SidebarContent, Avatar } from '@/components/shared/Sidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { NotificationsOverlay, useUnreadNotifCount } from '@/components/shared/NotificationsOverlay'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
const FD = 'var(--font-display)'
const MOTION = 'transform 0.32s cubic-bezier(0.32,0.72,0,1), border-radius 0.32s, box-shadow 0.32s'
const OPEN_RATIO = 0.64
const EDGE = 28 // px depuis le bord gauche pour amorcer l'ouverture

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const unreadNotifs = useUnreadNotifCount(notifOpen)
  const [reduce, setReduce] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const g = useRef({ active: false, dragging: false, startX: 0, startY: 0, base: 0, last: 0 })

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches); f(); m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  // Le Dashboard ouvre le chat IA via cet event (réutilise AIPanel).
  useEffect(() => {
    const open = () => setAiOpen(true)
    window.addEventListener('thw:open-coach', open)
    return () => window.removeEventListener('thw:open-coach', open)
  }, [])
  useEffect(() => {
    document.body.classList.toggle('drawer-open', open)
    return () => document.body.classList.remove('drawer-open')
  }, [open])

  function offsetPx() { return Math.min(window.innerWidth * OPEN_RATIO, 340) }
  // Pendant le drag : on peint via ref (transform direct, 60 fps, pas de setState/frame).
  function paint(x: number) {
    const el = panelRef.current; if (!el) return
    el.style.transform = `translateX(${x}px)`
    const on = x > 4
    el.style.borderRadius = on ? '22px' : '0px'
    el.style.boxShadow = on ? '-12px 0 40px rgba(0,0,0,0.30)' : 'none'
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
    st.startX = t.clientX; st.startY = t.clientY; st.dragging = false
    st.base = open ? offsetPx() : 0; st.last = st.base
    st.active = open || t.clientX <= EDGE // fermé : seulement depuis le bord
  }
  function onTouchMove(e: React.TouchEvent) {
    const st = g.current; if (!st.active) return
    const t = e.touches[0]; const dx = t.clientX - st.startX; const dy = t.clientY - st.startY
    if (!st.dragging) {
      if (Math.abs(dx) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) { st.active = false; return } // scroll vertical
      st.dragging = true
      if (panelRef.current) panelRef.current.style.transition = 'none'
    }
    const x = Math.max(0, Math.min(offsetPx(), st.base + dx))
    st.last = x; paint(x)
  }
  function onTouchEnd() {
    const st = g.current; if (!st.dragging) { st.active = false; return }
    st.dragging = false; st.active = false
    settle(st.last > offsetPx() * 0.4)
  }

  // /topup : page autonome (lien email), aucun chrome.
  if (pathname?.startsWith('/topup')) return <>{children}</>
  // Pages d'entrée (connexion, onboarding…) : plein écran, sans chrome.
  if (isFullscreenRoute(pathname)) {
    return <div className="md:hidden" style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)' }}>{children}</div>
  }
  const hideHeader = pathname?.startsWith('/competences')

  const hybridHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 14px', flexShrink: 0 }}>
      <span style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>Hybrid</span>
      <Link href="/profile" onClick={() => setOpen(false)} style={{ display: 'flex', textDecoration: 'none' }}>
        <Avatar url={profile?.avatar_url ?? null} name={profile?.full_name ?? null} size={38} />
      </Link>
    </div>
  )

  const fab: React.CSSProperties = {
    position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', width: 38, height: 38,
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)',
    background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', cursor: 'pointer', zIndex: 5, padding: 0,
  }

  return (
    <div className="md:hidden" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar fixe EN DESSOUS — fond identique à la page */}
      <aside style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${OPEN_RATIO * 100}%`, maxWidth: 340, zIndex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <SidebarContent headerSlot={hybridHeader} onClose={() => setOpen(false)} onOpenAI={() => { setAiOpen(true); setOpen(false) }} />
      </aside>

      {/* Page qui glisse PAR-DESSUS — transform piloté par l'état (cohérent au re-render) */}
      <div ref={panelRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'var(--bg)', overflow: 'hidden',
          transform: open ? 'translateX(min(64vw, 340px))' : 'translateX(0)',
          borderRadius: open ? 22 : 0,
          boxShadow: open ? '-12px 0 40px rgba(0,0,0,0.30)' : 'none',
          transition: reduce ? 'none' : MOTION }}>
        {!hideHeader && <>
          {/* Scrim léger en haut pour la lisibilité des boutons flottants */}
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-top) + 60px)', zIndex: 4, pointerEvents: 'none', background: 'linear-gradient(var(--bg), transparent)' }} />
          <button aria-label="Menu" onClick={() => settle(!open)} style={{ ...fab, left: 12, borderRadius: 12, flexDirection: 'column', gap: 4 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 17, height: 1.6, background: 'var(--text)', borderRadius: 2 }} />)}
          </button>
          {/* Cloche notifications — ouvre une surpage centrée (sans quitter la page) */}
          <button aria-label="Notifications" onClick={() => { setOpen(false); setNotifOpen(true) }}
            style={{ ...fab, right: 58, borderRadius: 12 }}>
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
          <button aria-label="Coach IA" onClick={() => setAiOpen(true)}
            style={{ ...fab, right: 12, borderRadius: 12, overflow: 'hidden' }}>
            {/* Shuriken Athéna classique 4 branches existant — non redessiné, sur verre neutre */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt="Coach IA" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </button>
        </>}

        <main style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], background: 'var(--bg)', paddingTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 58px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Zone visible de la page → tap pour fermer (n'apparaît qu'ouvert) */}
        {open && <div onClick={() => settle(false)} style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'transparent' }} />}
      </div>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialAgent="planning" />
      <NotificationsOverlay open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
