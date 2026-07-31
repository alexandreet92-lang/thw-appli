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

// Les pages qui lisent le scope planning (setPlanningScopeUid) doivent l'avoir
// défini AVANT le montage de leurs effets. On l'arme donc pour tous ces types.
const SCOPED_KINDS = new Set<DrawerKind>(['planning', 'calendar', 'training', 'recovery', 'nutrition'])

const Loading = () => <div style={{ padding: 40, color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-body)' }}>Chargement…</div>
const PlanningPage = dynamic(() => import('@/app/planning/page'), { ssr: false, loading: Loading })
const CalendarPage = dynamic(() => import('@/app/calendar/page'), { ssr: false, loading: Loading })
const RecoveryPage = dynamic(() => import('@/app/recovery/page'), { ssr: false, loading: Loading })
const NutritionPage = dynamic(() => import('@/app/nutrition/page'), { ssr: false, loading: Loading })
// « Training » = la vraie page athlète (route /activities, titrée « Training »),
// désormais câblée sur l'athlète ciblé via le scope planning.
const TrainingPage = dynamic(() => import('@/app/activities/page'), { ssr: false, loading: Loading })

const TITLE: Record<Exclude<DrawerKind, null>, string> = {
  planning: 'Planning', calendar: 'Calendrier', training: 'Training',
  recovery: 'Récupération', nutrition: 'Nutrition', message: 'Messages',
}

export function AthleteDetailDrawer({ kind, athleteId, coachId, name, avatar, onClose }: {
  kind: DrawerKind; athleteId: string; coachId: string | null; name: string; avatar: string | null; onClose: () => void
}) {
  const open = !!kind
  const [mounted, setMounted] = useState(false)

  // Scope défini AVANT le rendu des enfants (les pages athlète lisent le scope
  // dans leur effet de chargement via resolvePlanningUid).
  if (open && SCOPED_KINDS.has(kind) && typeof window !== 'undefined') setPlanningScopeUid(athleteId)

  useEffect(() => { if (open) setMounted(true) }, [open])
  useEffect(() => {
    if (!open) { setPlanningScopeUid(null); return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Masque le rail de la sidebar coach pendant le drawer → plein écran, tout en
    // laissant les modales des pages (ajout séance, objectif calendrier…) passer
    // au-dessus du drawer (le drawer est volontairement à un z-index bas).
    document.body.classList.add('thw-drawer-open')
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; document.body.classList.remove('thw-drawer-open'); setPlanningScopeUid(null) }
  }, [open, onClose])

  if (!mounted) return null

  const scoped = (node: React.ReactNode) => <PlanningScopeContext.Provider value={athleteId}>{node}</PlanningScopeContext.Provider>
  const body = kind === 'planning' ? scoped(<PlanningPage key={`p-${athleteId}`} />)
    : kind === 'calendar' ? scoped(<CalendarPage key={`c-${athleteId}`} />)
    : kind === 'recovery' ? scoped(<RecoveryPage key={`r-${athleteId}`} />)
    : kind === 'nutrition' ? scoped(<NutritionPage key={`n-${athleteId}`} />)
    : kind === 'training' ? scoped(<TrainingPage key={`t-${athleteId}`} />)
    : kind === 'message' ? (coachId ? <div style={{ height: '100%' }}><MessageThread coachId={coachId} athleteId={athleteId} compact /></div> : <Loading />)
    : null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: open ? 'auto' : 'none' }}>
      {/* Scrim */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity .28s ease' }} />
      {/* Panneau coulissant — plein écran */}
      <div style={{
        position: 'absolute', inset: 0, width: '100%',
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
