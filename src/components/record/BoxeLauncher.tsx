'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeLauncher — on NE crée PAS de séance ici. On affiche uniquement les séances
// de boxe PLANIFIÉES cette semaine (planned_sessions sport='boxe'), avec leur
// structure (circuits / rounds / exercices) lue depuis validation_data. On clique
// une séance → elle s'ouvre et se lance dans le lecteur en direct.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { weekStartStr } from '@/lib/date/weekStart'
import { sumComposedMinutes, type ComposedMove, type ComposedCircuit } from '@/components/planning/composedSports'
import type { BoxeSession } from './boxe/buildBoxeTimeline'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (session: BoxeSession) => void
}

interface PlannedRow {
  id: string; title: string | null; day_index: number
  validation_data: { composed?: ComposedMove[]; composedCircuits?: ComposedCircuit[]; composedCircuit?: ComposedCircuit } | null
}
interface PlannedBoxe { id: string; title: string; dayIndex: number; moves: ComposedMove[]; circuits: ComposedCircuit[]; minutes: number }

const ACCENT = '#ef4444'
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function BoxeLauncher({ open, onClose, onStart }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<PlannedBoxe[]>([])

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
          .select('id, title, day_index, validation_data')
          .eq('user_id', user.id).eq('sport', 'boxe').eq('week_start', weekStartStr(new Date()))
          .order('day_index', { ascending: true })
        if (cancelled) return
        const rows = (data ?? []) as PlannedRow[]
        const mapped: PlannedBoxe[] = rows.map(r => {
          const vd = r.validation_data ?? {}
          const moves = vd.composed ?? []
          const circuits = vd.composedCircuits ?? (vd.composedCircuit ? [vd.composedCircuit] : [])
          return { id: r.id, title: r.title || 'Séance boxe', dayIndex: r.day_index, moves, circuits, minutes: sumComposedMinutes(moves, circuits) }
        })
        setSessions(mapped)
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
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>Boxe</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>Tes séances de boxe planifiées cette semaine.</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0' }}>Chargement…</p>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 12px' }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🥊</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Aucune séance de boxe cette semaine</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>Crée une séance de boxe dans ton planning, puis reviens ici pour la lancer.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(s => (
                <button key={s.id} onClick={() => { onStart({ title: s.title, moves: s.moves, circuits: s.circuits }); handleClose() }}
                  style={{ textAlign: 'left', padding: '15px 16px', borderRadius: 16, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', gap: 13, width: '100%' }}>
                  <span style={{ width: 46, height: 46, borderRadius: 12, background: `${ACCENT}18`, color: ACCENT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>
                    <span style={{ fontSize: 9.5, opacity: 0.7 }}>{DAYS[s.dayIndex] ?? ''}</span>
                    <span style={{ fontSize: 17 }}>🥊</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {s.circuits.length > 0 ? `${s.circuits.length} circuit${s.circuits.length > 1 ? 's' : ''} · ` : ''}{s.moves.length} exo{s.moves.length > 1 ? 's' : ''}{s.minutes > 0 ? ` · ≈ ${s.minutes} min` : ''}
                    </span>
                  </span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
