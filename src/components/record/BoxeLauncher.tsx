'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeLauncher — on NE crée PAS de séance ici. On affiche uniquement les séances
// de boxe PLANIFIÉES cette semaine (planned_sessions sport='boxe'), avec leur
// structure (circuits / rounds / exercices) lue depuis validation_data. On clique
// une séance → elle s'ouvre et se lance dans le lecteur en direct.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { weekStartStr } from '@/lib/date/weekStart'
import { sumComposedMinutes, type ComposedMove, type ComposedCircuit, type ComposedSport } from '@/components/planning/composedSports'
import type { BoxeSession } from './boxe/buildBoxeTimeline'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (session: BoxeSession) => void
  sport?: ComposedSport   // 'boxe' (défaut) ou 'hybrid' — même lecteur composé
}

interface PlannedRow {
  id: string; title: string | null; day_index: number; week_start: string
  validation_data: { composed?: ComposedMove[]; composedCircuits?: ComposedCircuit[]; composedCircuit?: ComposedCircuit } | null
}
interface PlannedBoxe { id: string; title: string; dayIndex: number; weekStart: string; moves: ComposedMove[]; circuits: ComposedCircuit[]; minutes: number }

const ACCENT = 'var(--text)'
const tint = (pct: number) => `color-mix(in srgb, var(--text) ${pct}%, transparent)`
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function BoxeLauncher({ open, onClose, onStart, sport = 'boxe' }: Props) {
  const { t } = useI18n()
  const SPORT_LABEL = sport === 'hybrid' ? 'Hybrid' : 'Boxe'
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<PlannedBoxe[]>([])   // toutes les séances du sport
  const [thisWeek, setThisWeek] = useState<PlannedBoxe[]>([])   // planifiées cette semaine

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const { data } = await sb.from('planned_sessions')
          .select('id, title, day_index, week_start, validation_data')
          .eq('user_id', user.id).eq('sport', sport)
          .order('week_start', { ascending: false }).order('day_index', { ascending: true })
        if (cancelled) return
        const rows = (data ?? []) as PlannedRow[]
        const wk = weekStartStr(new Date())
        const mapped: PlannedBoxe[] = rows.map(r => {
          const vd = r.validation_data ?? {}
          const moves = vd.composed ?? []
          const circuits = vd.composedCircuits ?? (vd.composedCircuit ? [vd.composedCircuit] : [])
          return { id: r.id, title: r.title || `Séance ${SPORT_LABEL.toLowerCase()}`, dayIndex: r.day_index, weekStart: r.week_start, moves, circuits, minutes: sumComposedMinutes(moves, circuits) }
        })
        setSessions(mapped)
        setThisWeek(mapped.filter(m => m.weekStart === wk))
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [open])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  if (!mounted || !open) return null

  return createPortal(
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'boxeScrim .2s ease' }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10001,
        background: 'var(--bg-card)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
        maxHeight: '86dvh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
        animation: closing ? 'boxeDown .23s ease forwards' : 'boxeUp .3s cubic-bezier(.2,.8,.2,1)',
      }}>
        <style>{`@keyframes boxeScrim{from{opacity:0}to{opacity:1}}@keyframes boxeUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes boxeDown{from{transform:translateY(0)}to{transform:translateY(100%)}}`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{ padding: '14px 20px 6px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>{SPORT_LABEL}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>Choisis une séance à lancer, ou démarre sans programme.</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0' }}>Chargement…</p>
          ) : (
            <>
              {/* SECTION 1 — Training Planning : séances planifiées cette semaine */}
              <SectionLabel>Training Planning</SectionLabel>
              {thisWeek.length === 0 ? (
                <EmptyHint>Aucune séance de {SPORT_LABEL.toLowerCase()} planifiée cette semaine.</EmptyHint>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {thisWeek.map(s => <SessionRow key={s.id} s={s} onPick={() => { onStart({ title: s.title, moves: s.moves, circuits: s.circuits, sport }); handleClose() }} />)}
                </div>
              )}

              {/* SECTION 2 — Training Session : toutes les séances créées de ce sport */}
              <SectionLabel>Training Session</SectionLabel>
              {sessions.length === 0 ? (
                <EmptyHint>Aucune séance de {SPORT_LABEL.toLowerCase()} créée. Crée-en une dans ton planning.</EmptyHint>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {sessions.map(s => <SessionRow key={s.id} s={s} onPick={() => { onStart({ title: s.title, moves: s.moves, circuits: s.circuits, sport }); handleClose() }} />)}
                </div>
              )}

              {/* SECTION 3 — No Training : lancer sans programme */}
              <SectionLabel>No Training</SectionLabel>
              <button onClick={() => { onStart({ title: `Séance ${SPORT_LABEL.toLowerCase()} libre`, moves: [], circuits: [], sport, free: true }); handleClose() }}
                style={{ width: '100%', padding: '15px 16px', borderRadius: 16, cursor: 'pointer', border: `1px solid ${ACCENT}`, background: tint(8), color: ACCENT, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Lancer sans programme
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{children}</p>
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 20px', lineHeight: 1.5 }}>{children}</p>
}

function SessionRow({ s, onPick }: { s: PlannedBoxe; onPick: () => void }) {
  return (
    <button onClick={onPick}
      style={{ textAlign: 'left', padding: '15px 16px', borderRadius: 16, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', gap: 13, width: '100%' }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: tint(9), color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
        {DAYS[s.dayIndex] ?? ''}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
          {s.circuits.length > 0 ? `${s.circuits.length} circuit${s.circuits.length > 1 ? 's' : ''} · ` : ''}{s.moves.length} exo{s.moves.length > 1 ? 's' : ''}{s.minutes > 0 ? ` · ≈ ${s.minutes} min` : ''}
        </span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
}
