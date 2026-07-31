'use client'
// ══════════════════════════════════════════════════════════════
// Drawer athlète — sur-page coulissante depuis la DROITE, par-dessus la fiche.
// Ouvre les pages de l'athlète (Planning, Calendrier, Message…) sans quitter la
// fiche. Planning/Calendrier réutilisent la vraie page athlète, câblée sur
// l'athlète via le scope planning. Chargées à la demande (dynamic import).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { setPlanningScopeUid, PlanningScopeContext } from '@/lib/planning/scope'
import { MessageThread } from './MessageThread'
import { Avatar } from '@/components/shared/Sidebar'

export type DrawerKind = 'planning' | 'calendar' | 'training' | 'recovery' | 'nutrition' | 'message' | null

const Loading = () => <div style={{ padding: 40, color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-body)' }}>Chargement…</div>
const PlanningPage = dynamic(() => import('@/app/planning/page'), { ssr: false, loading: Loading })
const CalendarPage = dynamic(() => import('@/app/calendar/page'), { ssr: false, loading: Loading })

const TITLE: Record<Exclude<DrawerKind, null>, string> = {
  planning: 'Planning', calendar: 'Calendrier', training: 'Training',
  recovery: 'Récupération', nutrition: 'Nutrition', message: 'Messages',
}

function Soon({ label }: { label: string }) {
  return (
    <div style={{ padding: '48px clamp(20px,5vw,40px)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: 54, height: 54, borderRadius: 16, margin: '0 auto 16px', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{label} de l’athlète</h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: 0, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>Cette page arrive bientôt — je la branche sur les données de l’athlète dans le prochain lot.</p>
    </div>
  )
}

export function AthleteDetailDrawer({ kind, athleteId, coachId, name, avatar, onClose }: {
  kind: DrawerKind; athleteId: string; coachId: string | null; name: string; avatar: string | null; onClose: () => void
}) {
  const open = !!kind
  const [mounted, setMounted] = useState(false)

  // Scope défini AVANT le rendu des enfants (Planning/Calendrier lisent le scope
  // dans leur effet de chargement).
  if (open && (kind === 'planning' || kind === 'calendar') && typeof window !== 'undefined') setPlanningScopeUid(athleteId)

  useEffect(() => { if (open) setMounted(true) }, [open])
  useEffect(() => {
    if (!open) { setPlanningScopeUid(null); return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; setPlanningScopeUid(null) }
  }, [open, onClose])

  if (!mounted) return null

  const scoped = (node: React.ReactNode) => <PlanningScopeContext.Provider value={athleteId}>{node}</PlanningScopeContext.Provider>
  const body = kind === 'planning' ? scoped(<PlanningPage key={`p-${athleteId}`} />)
    : kind === 'calendar' ? scoped(<CalendarPage key={`c-${athleteId}`} />)
    : kind === 'message' ? (coachId ? <div style={{ height: '100%' }}><MessageThread coachId={coachId} athleteId={athleteId} compact /></div> : <Loading />)
    : kind ? <Soon label={TITLE[kind]} /> : null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 11000, pointerEvents: open ? 'auto' : 'none' }}>
      {/* Scrim */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity .28s ease' }} />
      {/* Panneau coulissant */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(1120px, 96vw)',
        background: 'var(--bg)', boxShadow: '-16px 0 60px rgba(0,0,0,0.34)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px clamp(14px,3vw,22px)', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" transform="rotate(180 12 12)" /></svg>
          </button>
          <Avatar url={avatar} name={name} size={34} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{kind ? TITLE[kind] : ''}</div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          {body}
        </div>
      </div>
    </div>,
    document.body,
  )
}
