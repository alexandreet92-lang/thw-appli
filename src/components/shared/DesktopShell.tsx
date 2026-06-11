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

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
const FD = 'var(--font-display)'
const W = 248
const SCROLL: React.CSSProperties['WebkitOverflowScrolling'] = 'touch'

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile } = useProfile()
  const [open, setOpen] = useState(true)
  const [aiOpen, setAiOpen] = useState(false)
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

  // /topup : page autonome (lien email), aucun chrome.
  if (pathname?.startsWith('/topup')) {
    return <div className="hidden md:block" style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)' }}>{children}</div>
  }

  const ease = reduce ? 'none' : '0.3s cubic-bezier(0.4,0,0.2,1)'

  const hybridHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 14px', flexShrink: 0 }}>
      <span style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>Hybrid</span>
      <Link href="/profile" style={{ display: 'flex', textDecoration: 'none' }}>
        <Avatar url={profile?.avatar_url ?? null} name={profile?.full_name ?? null} size={38} />
      </Link>
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
      {/* Sidebar ancrée — fond identique à la page, séparée par une ombre douce */}
      <aside style={{
        width: open ? W : 0, flexShrink: 0, height: '100vh', overflow: 'hidden',
        background: 'var(--bg)', borderRight: open ? '1px solid var(--border)' : 'none',
        boxShadow: open ? '3px 0 16px rgba(0,0,0,0.05)' : 'none',
        transition: reduce ? 'none' : `width ${ease}, box-shadow ${ease}`,
      }}>
        {/* Largeur interne fixe : le contenu ne se comprime pas pendant l'animation */}
        <div style={{ width: W, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <SidebarContent headerSlot={hybridHeader} onOpenAI={() => setAiOpen(true)} />
        </div>
      </aside>

      {/* Contenu — reprend toute la largeur au repli (push, jamais recouvert) */}
      <main style={{
        flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        position: 'relative', background: 'var(--bg)', scrollBehavior: 'smooth', WebkitOverflowScrolling: SCROLL,
      }}>
        {/* Scrim léger en haut */}
        <div aria-hidden style={{ position: 'fixed', top: 0, left: open ? W : 0, right: 0, height: 62, zIndex: 50, pointerEvents: 'none', background: 'linear-gradient(var(--bg), transparent)', transition: reduce ? 'none' : `left ${ease}` }} />

        {/* ☰ repli — suit le bord de la sidebar */}
        <button aria-label="Replier le menu" onClick={() => setOpen(o => !o)}
          style={{ ...fab, left: open ? W + 12 : 12, flexDirection: 'column', gap: 4 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 17, height: 1.6, background: 'var(--text)', borderRadius: 2 }} />)}
        </button>

        {/* Cloche notifications — à gauche du shuriken (entrée seulement) */}
        <Link href="/notifications" aria-label="Notifications"
          style={{ ...fab, right: 62, left: 'auto' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>

        {/* Shuriken IA — droite (asset classique 4 branches, sur verre neutre pour qu'il ressorte) */}
        <button aria-label="Coach IA" onClick={() => setAiOpen(true)}
          style={{ ...fab, right: 16, left: 'auto', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="Coach IA" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        </button>

        <PageTransition>{children}</PageTransition>
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialAgent="planning" />
    </div>
  )
}
