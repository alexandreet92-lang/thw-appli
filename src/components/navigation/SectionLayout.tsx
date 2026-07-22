'use client'

// ══════════════════════════════════════════════════════════════
// SectionLayout — navigation latérale unifiée (rail desktop au hover
// + onglets mobile avec slide). Réutilisé par Profil, Planning,
// Calendar. Style de référence : ancienne nav de Mon Profil.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { SwipeDeck } from '@/components/ui/SwipeDeck'

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
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', overflowX: 'clip' }}>
        {styleBlock}
        {/* Rail TOUJOURS ouvert, épinglé (sticky) : reste visible au scroll. */}
        <aside
          style={{
            width: 214, flexShrink: 0, alignSelf: 'flex-start',
            position: 'sticky', top: 0, zIndex: 5,
            maxHeight: 'calc(100vh - var(--header-height))', overflowY: 'auto',
            background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
            padding: '20px 10px 14px',
          }}
        >
          {/* Titre de la page AU-DESSUS des bulles (aligné, façon Supabase). */}
          {header && <div style={{ padding: '0 6px 14px', marginBottom: 6, borderBottom: '1px solid var(--border)' }}>{header}</div>}
          {sections.map(s => {
            const active = activeId === s.id
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => go(s.id)} title={s.label}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', borderRadius: 9, marginBottom: 3, cursor: 'pointer',
                  border: 'none', textAlign: 'left', fontFamily: 'DM Sans,sans-serif',
                  background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
                  transition: 'background 0.14s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {active && <span style={{ position: 'absolute', left: -8, top: 7, bottom: 7, width: 3, borderRadius: '0 3px 3px 0', background: CYAN }} />}
                <Icon size={16} color={active ? CYAN : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? CYAN : 'var(--text)', letterSpacing: '-0.01em' }}>{s.label}</span>
                  {s.subtitle && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.subtitle}</span>}
                </span>
              </button>
            )
          })}
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: '24px 28px 80px' }}>
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
      <SwipeDeck
        index={Math.max(0, ids.indexOf(activeId))}
        count={sections.length}
        onIndexChange={i => go(ids[i])}
        renderPanel={i => (
          <div style={{ padding: '14px 12px 0' }}>
            <div style={containerStyle}>{sections[i]?.content}</div>
          </div>
        )}
      />
    </div>
  )
}
