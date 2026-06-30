'use client'

// ══════════════════════════════════════════════════════════════
// SectionLayout — navigation latérale unifiée (rail desktop au hover
// + onglets mobile avec slide). Réutilisé par Profil, Planning,
// Calendar. Style de référence : ancienne nav de Mon Profil.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

export interface SectionDef {
  id:        string
  label:     string
  short?:    string          // libellé court (onglets mobile) — défaut = label
  subtitle?: string          // sous-titre affiché dans le rail desktop étendu
  icon:      LucideIcon
  content:   ReactNode
}

interface SectionLayoutProps {
  sections:         SectionDef[]
  defaultSection?:  string
  header?:          ReactNode
  /** Si fourni, l'onglet actif est synchronisé avec ce search param (ex: "tab"). */
  urlParam?:        string
  /** Largeur max du conteneur de contenu (centré). Défaut : pleine largeur. */
  contentMaxWidth?: number
}

const CYAN = '#06B6D4'

export function SectionLayout({
  sections, defaultSection, header, urlParam, contentMaxWidth,
}: SectionLayoutProps) {
  const router = useRouter()
  const ids = sections.map(s => s.id)

  const [activeId, setActiveId] = useState<string>(
    () => (defaultSection && ids.includes(defaultSection) ? defaultSection : sections[0]?.id) ?? '',
  )
  const [dir, setDir] = useState<'right' | 'left'>('right')
  const [isDesktop, setIsDesktop] = useState(false)
  const [railOpen, setRailOpen] = useState(false)

  // Responsive
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Lecture initiale du param d'URL (SSR-safe : appliquée après montage)
  useEffect(() => {
    if (!urlParam) return
    const v = new URLSearchParams(window.location.search).get(urlParam)
    if (v && ids.includes(v)) {
      setActiveId(prev => {
        if (v !== prev) setDir(ids.indexOf(v) > ids.indexOf(prev) ? 'right' : 'left')
        return v
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(next: string) {
    if (next === activeId) return
    setDir(ids.indexOf(next) > ids.indexOf(activeId) ? 'right' : 'left')
    setActiveId(next)
    if (urlParam) {
      try {
        const url = new URL(window.location.href)
        url.searchParams.set(urlParam, next)
        router.replace(url.pathname + url.search, { scroll: false })
      } catch { /* ignore */ }
    }
  }

  // Swipe horizontal au doigt → section précédente / suivante (mobile, façon Strava).
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const onSwipeStart = (e: React.TouchEvent) => { const t = e.touches[0]; swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() } }
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current; swipeRef.current = null; if (!s) return
    const c = e.changedTouches[0]; const dx = c.clientX - s.x; const dy = c.clientY - s.y
    if (Date.now() - s.t > 600) return
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    const i = ids.indexOf(activeId); const ni = i + (dx < 0 ? 1 : -1)
    if (ni >= 0 && ni < ids.length) go(ids[ni])
  }

  const activeContent = sections.find(s => s.id === activeId)?.content ?? null

  const containerStyle: React.CSSProperties = contentMaxWidth
    ? { width: '100%', maxWidth: contentMaxWidth, margin: '0 auto', boxSizing: 'border-box', overflowWrap: 'break-word' }
    : { width: '100%', boxSizing: 'border-box' }

  const content = (
    <div key={activeId} className={dir === 'right' ? 'sl-slide-right' : 'sl-slide-left'}>
      {activeContent}
    </div>
  )

  const styleBlock = (
    <style>{`
      @keyframes slSlideRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slSlideLeft  { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .sl-slide-right { animation: slSlideRight 280ms cubic-bezier(0.32,0.72,0,1); }
      .sl-slide-left  { animation: slSlideLeft 280ms cubic-bezier(0.32,0.72,0,1); }
      .sl-tabscroll { scrollbar-width: none; }
      .sl-tabscroll::-webkit-scrollbar { display: none; }
    `}</style>
  )

  // ── DESKTOP : rail collé au bord gauche ────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', overflowX: 'hidden' }}>
        {styleBlock}
        {/* Spacer 56px : réserve la place, l'aside s'étend en overlay vers la droite */}
        <div style={{ width: 56, flexShrink: 0, position: 'relative', alignSelf: 'stretch' }}>
          <aside
            onMouseEnter={() => setRailOpen(true)}
            onMouseLeave={() => setRailOpen(false)}
            style={{
              position: 'sticky', top: 0, left: 0, zIndex: 5,
              width: railOpen ? 220 : 56, overflow: 'hidden',
              background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
              padding: '14px 8px', minHeight: 'calc(100vh - var(--header-height))',
              boxShadow: railOpen ? '8px 0 28px rgba(0,0,0,0.16)' : 'none',
              transition: 'width 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms',
            }}
          >
            {sections.map(s => {
              const active = activeId === s.id
              const Icon = s.icon
              return (
                <button key={s.id} onClick={() => go(s.id)} title={s.label}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '11px 11px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                    border: 'none', textAlign: 'left', fontFamily: 'DM Sans,sans-serif',
                    background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
                    transition: 'background 0.14s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {active && <span style={{ position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', background: CYAN }} />}
                  <Icon size={18} color={active ? CYAN : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, opacity: railOpen ? 1 : 0, transition: 'opacity 150ms ease' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: active ? CYAN : 'var(--text)' }}>{s.label}</span>
                    {s.subtitle && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.subtitle}</span>}
                  </span>
                </button>
              )
            })}
          </aside>
        </div>
        <main style={{ flex: 1, minWidth: 0, padding: '28px 28px 80px' }}>
          {header && <div style={{ marginBottom: 18 }}>{header}</div>}
          <div style={containerStyle}>{content}</div>
        </main>
      </div>
    )
  }

  // ── MOBILE / TABLET : onglets pleine largeur + slide ───────────
  const tabFont = sections.length >= 4 ? 12 : 13
  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '0 0 80px', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {styleBlock}
      {header && <div style={{ padding: '24px 16px 0' }}>{header}</div>}
      {/* Onglets mobile — segmented control « pilule » (style Dashboard), défilable au doigt */}
      <div className="sl-tabscroll" style={{ padding: '12px 12px 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div role="tablist" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--bg-card2)' }}>
          {sections.map(s => {
            const active = activeId === s.id
            return (
              <button key={s.id} role="tab" aria-selected={active} onClick={() => go(s.id)}
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 16px',
                  fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap', fontSize: tabFont,
                  fontWeight: active ? 700 : 600,
                  background: active ? 'var(--bg-elev)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-mid)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {s.short ?? s.label}
              </button>
            )
          })}
        </div>
      </div>
      <div onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} style={{ padding: '14px 12px 0', touchAction: 'pan-y' }}>
        <div style={containerStyle}>{content}</div>
      </div>
    </div>
  )
}
