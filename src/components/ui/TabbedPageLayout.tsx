'use client'
// Sous-navigation réutilisable des pages à onglets (DESIGN_SYSTEM.md §4.1).
// Reproduit le RAIL de Planning/Calendar (SectionLayout) : rail desktop 56px replié
// → 220px au survol (icône + libellé + sous-titre + indicateur actif), onglets mobile
// en haut + transition. Version CONTRÔLÉE (active/onChange) + tokens uniquement.
// Transparent tant qu'il y a < 2 onglets ; respecte prefers-reduced-motion.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

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
  children: React.ReactNode
}

export function TabbedPageLayout<T extends string>({ title, headerExtra, tabs, active, onChange, children }: Props<T>) {
  const reduce = useReducedMotion()
  const isDesktop = useWidth() >= 1024
  const [railOpen, setRailOpen] = useState(false)

  const header = (title || headerExtra) ? (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {title && <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h1>}
      {headerExtra}
    </div>
  ) : null

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={active}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )

  if (tabs.length < 2) {
    return <div style={{ padding: isDesktop ? '28px 28px 80px' : '20px 16px 80px' }}>{header}{content}</div>
  }

  // ── Desktop : rail collé au bord gauche (overlay au survol) ──
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', overflowX: 'hidden' }}>
        <div style={{ width: 56, flexShrink: 0, position: 'relative', alignSelf: 'stretch' }}>
          <aside onMouseEnter={() => setRailOpen(true)} onMouseLeave={() => setRailOpen(false)}
            style={{ position: 'sticky', top: 0, left: 0, zIndex: 5, width: railOpen ? 220 : 56, overflow: 'hidden',
              background: 'var(--bg)', borderRight: '0.5px solid var(--border)', padding: '14px 8px',
              minHeight: 'calc(100vh - var(--header-height))', boxShadow: railOpen ? 'var(--shadow)' : 'none',
              transition: 'width 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms' }}>
            {tabs.map(t => {
              const on = t.id === active, Icon = t.icon
              return (
                <button key={t.id} onClick={() => onChange(t.id)} title={t.label}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 11px',
                    borderRadius: 10, marginBottom: 4, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: FB,
                    background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.14s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  {on && <span style={{ position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--primary)' }} />}
                  <Icon size={18} color={on ? 'var(--primary)' : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, opacity: railOpen ? 1 : 0, transition: 'opacity 150ms ease' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--text)' }}>{t.label}</span>
                    {t.subtitle && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.subtitle}</span>}
                  </span>
                </button>
              )
            })}
          </aside>
        </div>
        <main style={{ flex: 1, minWidth: 0, padding: '28px 28px 80px' }}>
          {header}
          {content}
        </main>
      </div>
    )
  }

  // ── Mobile : onglets pleine largeur en haut ──
  return (
    <div style={{ width: '100%', padding: '20px 16px 80px', overflowX: 'hidden' }}>
      {header}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
        {tabs.map(t => {
          const on = t.id === active
          return (
            <button key={t.id} onClick={() => onChange(t.id)}
              style={{ flex: 1, minWidth: 0, position: 'relative', textAlign: 'center', padding: '12px 4px', background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: FB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontSize: tabs.length >= 4 ? 12 : 14, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-dim)' }}>
              {t.short ?? t.label}
              {on && <span style={{ position: 'absolute', bottom: -1, left: 10, right: 10, height: 2, background: 'var(--text)' }} />}
            </button>
          )
        })}
      </div>
      {content}
    </div>
  )
}
