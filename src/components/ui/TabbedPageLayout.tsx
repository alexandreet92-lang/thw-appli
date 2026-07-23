'use client'
// Sous-navigation réutilisable des pages à onglets (DESIGN_SYSTEM.md §4.1).
// Reproduit le RAIL de Planning/Calendar (SectionLayout) : rail desktop 56px replié
// → 220px au survol (icône + libellé + sous-titre + indicateur actif), onglets mobile
// en haut + transition. Version CONTRÔLÉE (active/onChange) + tokens uniquement.
// Transparent tant qu'il y a < 2 onglets ; respecte prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { SwipeDeck } from '@/components/ui/SwipeDeck'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function useWidth(): number {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)
  useEffect(() => {
    const f = () => setW(window.innerWidth)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return w
}

export interface PageTab<T extends string> { id: T; label: string; short?: string; subtitle?: string; icon: LucideIcon }

interface Props<T extends string> {
  title?: string
  headerExtra?: React.ReactNode
  tabs: PageTab<T>[]
  active: T
  onChange: (id: T) => void
  children?: React.ReactNode
  /** Si fourni (mobile) : vrai pager au doigt façon Strava — rend chaque onglet. */
  renderPanel?: (id: T) => React.ReactNode
}

export function TabbedPageLayout<T extends string>({ title, headerExtra, tabs, active, onChange, children, renderPanel }: Props<T>) {
  const reduce = useReducedMotion()
  const isDesktop = useWidth() >= 1024

  // Sens du glissement selon l'ordre des onglets (mouvement directionnel).
  const activeIdx = tabs.findIndex(t => t.id === active)
  const prevIdx = useRef(activeIdx)
  const dir = activeIdx >= prevIdx.current ? 1 : -1
  useEffect(() => { prevIdx.current = activeIdx }, [activeIdx])

  // Swipe horizontal au doigt → onglet précédent / suivant (mobile, façon Strava).
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const onSwipeStart = (e: React.TouchEvent) => { const t = e.touches[0]; swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() } }
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current; swipeRef.current = null; if (!s) return
    const c = e.changedTouches[0]; const dx = c.clientX - s.x; const dy = c.clientY - s.y
    if (Date.now() - s.t > 600) return
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    const ni = activeIdx + (dx < 0 ? 1 : -1)
    if (ni >= 0 && ni < tabs.length) onChange(tabs[ni].id)
  }

  const header = (title || headerExtra) ? (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {title && <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h1>}
      {headerExtra}
    </div>
  ) : null

  const content = (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div key={active} custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }),
        }}
        initial="enter" animate="center" exit="exit"
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}>
        {renderPanel ? renderPanel(active) : children}
      </motion.div>
    </AnimatePresence>
  )

  if (tabs.length < 2) {
    return <div style={{ padding: isDesktop ? '28px 28px 80px' : '20px 16px 80px' }}>{header}{content}</div>
  }

  // ── Desktop : rail TOUJOURS OUVERT (identique à Planning/Calendar) ──
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', overflowX: 'clip' }}>
        <aside
          style={{
            width: 214, flexShrink: 0, alignSelf: 'stretch',
            position: 'sticky', top: 0, zIndex: 5,
            maxHeight: 'calc(100vh - var(--header-height))', overflowY: 'auto',
            background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
            padding: '20px 10px 14px',
          }}
        >
          {/* Titre de la page AU-DESSUS des bulles (façon Planning/Calendar). */}
          {title && (
            <div style={{ padding: '0 6px 14px', marginBottom: 6, borderBottom: '1px solid var(--border)' }}>
              <h1 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h1>
            </div>
          )}
          {tabs.map(t => {
            const on = t.id === active, Icon = t.icon
            return (
              <button key={t.id} onClick={() => onChange(t.id)} title={t.label}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
                  borderRadius: 9, marginBottom: 3, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: FB,
                  background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.14s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                {on && <span style={{ position: 'absolute', left: -8, top: 7, bottom: 7, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--primary)' }} />}
                <Icon size={16} color={on ? 'var(--primary)' : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--text)', letterSpacing: '-0.01em' }}>{t.label}</span>
                  {t.subtitle && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t.subtitle}</span>}
                </span>
              </button>
            )
          })}
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: '24px 28px 80px' }}>
          {headerExtra && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>{headerExtra}</div>}
          {content}
        </main>
      </div>
    )
  }

  // ── Mobile : onglets « pilule » (segmented control, identique à Nutrition) ──
  const tabsBar = (
    <div className="tpl-tabscroll" style={{ marginBottom: 'var(--space-5)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <style>{`.tpl-tabscroll{scrollbar-width:none}.tpl-tabscroll::-webkit-scrollbar{display:none}`}</style>
      <div role="tablist" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--bg-card2)' }}>
        {tabs.map(t => {
          const on = t.id === active
          return (
            <button key={t.id} role="tab" aria-selected={on} onClick={() => onChange(t.id)}
              style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 16px', fontFamily: FB, whiteSpace: 'nowrap',
                fontSize: 13, fontWeight: on ? 700 : 600,
                background: on ? 'var(--bg-elev)' : 'transparent',
                color: on ? 'var(--text)' : 'var(--text-mid)',
                boxShadow: on ? 'var(--shadow-card)' : 'none',
                transition: 'background 0.18s, color 0.18s' }}>
              {t.short ?? t.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  // Avec renderPanel → vrai pager au doigt (façon Strava), plein cadre.
  if (renderPanel) {
    return (
      <div style={{ width: '100%', paddingBottom: 80, overflowX: 'hidden' }}>
        <div style={{ padding: '20px 16px 0' }}>{header}{tabsBar}</div>
        <SwipeDeck
          index={Math.max(0, activeIdx)}
          count={tabs.length}
          onIndexChange={i => onChange(tabs[i].id)}
          renderPanel={i => <div style={{ padding: '0 16px' }}>{renderPanel(tabs[i].id)}</div>}
        />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', padding: '20px 16px 80px', overflowX: 'hidden' }}>
      {header}
      {tabsBar}
      <div onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} style={{ touchAction: 'pan-y' }}>
        {content}
      </div>
    </div>
  )
}
