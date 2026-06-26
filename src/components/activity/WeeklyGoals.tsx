'use client'
// ══════════════════════════════════════════════════════════════════
// WeeklyGoals — objectifs hebdomadaires de l'athlète + série (streak).
//  • Objectifs : nb de séances / semaine, volume horaire, et distance par sport
//    (uniquement les sports où la distance a un sens : run, vélo, natation,
//    aviron, ski — PAS muscu/hyrox/box).
//  • Série : nombre de semaines consécutives « actives » = ≥ 3 séances/semaine.
// Persisté en base (table training_goals, RLS user-scoped).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { IconFlame, IconSettings } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

interface Act { started_at: string; sport_type: string; moving_time_s: number | null; distance_m: number | null }
interface Goals { sessions_per_week: number | null; weekly_hours: number | null; distances: Record<string, number> | null }

const DIST_SPORTS = [
  { key: 'run',    label: 'Running',  match: ['run', 'trail_run'], color: 'var(--sport-run)' },
  { key: 'bike',   label: 'Vélo',     match: ['bike', 'virtual_bike'], color: 'var(--sport-bike)' },
  { key: 'swim',   label: 'Natation', match: ['swim'], color: 'var(--sport-swim)' },
  { key: 'rowing', label: 'Aviron',   match: ['rowing'], color: '#8b5cf6' },
  { key: 'ski',    label: 'Ski',      match: ['ski', 'nordic_ski', 'backcountry_ski'], color: '#ec4899' },
]
const BLANK: Goals = { sessions_per_week: null, weekly_hours: null, distances: null }
const WEEK = 7 * 86400000
const ACTIVE = 3 // séances/semaine pour qu'une semaine compte

function weekStartOf(d: Date): number {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime()
}

function Bar({ label, cur, goal, unit, color }: { label: string; cur: number; goal: number; unit: string; color: string }) {
  const pct = goal > 0 ? Math.min(100, (cur / goal) * 100) : 0
  const done = goal > 0 && cur >= goal
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: done ? color : 'var(--text)', fontWeight: 700 }}>{cur % 1 === 0 ? cur : cur.toFixed(1)}</span> / {goal} {unit}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box',
}

export function WeeklyGoals({ activities }: { activities: Act[] }) {
  const [goals, setGoals] = useState<Goals>(BLANK)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Goals>(BLANK)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const sb = createClient()
        const { data } = await sb.from('training_goals').select('sessions_per_week, weekly_hours, distances').maybeSingle()
        if (alive && data) setGoals({ sessions_per_week: data.sessions_per_week ?? null, weekly_hours: data.weekly_hours ?? null, distances: data.distances ?? null })
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  // Stats de la semaine en cours.
  const wk = useMemo(() => {
    const ws = weekStartOf(new Date())
    const inWeek = activities.filter(a => new Date(a.started_at).getTime() >= ws)
    const sessions = inWeek.length
    const hours = inWeek.reduce((s, a) => s + (a.moving_time_s ?? 0), 0) / 3600
    const distOf = (match: string[]) => inWeek.filter(a => match.includes(a.sport_type)).reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000
    return { sessions, hours, distOf }
  }, [activities])

  // Série : semaines consécutives avec ≥ ACTIVE séances.
  const streak = useMemo(() => {
    const counts = new Map<number, number>()
    for (const a of activities) { const w = weekStartOf(new Date(a.started_at)); counts.set(w, (counts.get(w) ?? 0) + 1) }
    let s = 0; let cur = weekStartOf(new Date())
    if ((counts.get(cur) ?? 0) >= ACTIVE) s++
    cur -= WEEK
    while ((counts.get(cur) ?? 0) >= ACTIVE) { s++; cur -= WEEK }
    return s
  }, [activities])

  async function saveGoals() {
    setGoals(draft); setEditing(false)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('training_goals').upsert({
        user_id: user.id,
        sessions_per_week: draft.sessions_per_week, weekly_hours: draft.weekly_hours,
        distances: draft.distances, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch { /* best-effort */ }
  }

  const hasGoals = goals.sessions_per_week || goals.weekly_hours || (goals.distances && Object.values(goals.distances).some(v => v > 0))
  const distGoals = DIST_SPORTS.filter(s => (goals.distances?.[s.key] ?? 0) > 0)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasGoals ? 14 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>Objectifs hebdo</span>
        {streak > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.12)', padding: '3px 9px', borderRadius: 999 }}>
            <IconFlame size={14} /> {streak} sem.
          </span>
        )}
        <button onClick={() => { setDraft(goals); setEditing(true) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }} aria-label="Régler les objectifs">
          <IconSettings size={17} />
        </button>
      </div>

      {!hasGoals ? (
        <button onClick={() => { setDraft(goals); setEditing(true) }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 12 }}>
          + Définir mes objectifs
        </button>
      ) : (
        <>
          {goals.sessions_per_week ? <Bar label="Séances" cur={wk.sessions} goal={goals.sessions_per_week} unit="" color="var(--accent)" /> : null}
          {goals.weekly_hours ? <Bar label="Volume" cur={Math.round(wk.hours * 10) / 10} goal={goals.weekly_hours} unit="h" color="#06b6d4" /> : null}
          {distGoals.map(s => <Bar key={s.key} label={s.label} cur={Math.round(wk.distOf(s.match) * 10) / 10} goal={goals.distances![s.key]} unit="km" color={s.color} />)}
        </>
      )}

      {editing && (
        <div onClick={() => setEditing(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '86vh', overflowY: 'auto', background: 'var(--bg)', borderRadius: '18px 18px 0 0', padding: 20, paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Objectifs de la semaine</h3>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 20, padding: 4 }}>✕</button>
            </div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nombre de séances / semaine</label>
            <input type="number" min={0} value={draft.sessions_per_week ?? ''} onChange={e => setDraft(d => ({ ...d, sessions_per_week: e.target.value ? Number(e.target.value) : null }))} style={{ ...inp, marginBottom: 14 }} />
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Volume horaire (h / semaine)</label>
            <input type="number" min={0} step={0.5} value={draft.weekly_hours ?? ''} onChange={e => setDraft(d => ({ ...d, weekly_hours: e.target.value ? Number(e.target.value) : null }))} style={{ ...inp, marginBottom: 16 }} />
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Distance / semaine (km)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {DIST_SPORTS.map(s => (
                <div key={s.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{s.label}</label>
                  <input type="number" min={0} value={draft.distances?.[s.key] ?? ''} onChange={e => setDraft(d => ({ ...d, distances: { ...(d.distances ?? {}), [s.key]: e.target.value ? Number(e.target.value) : 0 } }))} style={inp} />
                </div>
              ))}
            </div>
            <button onClick={saveGoals} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  )
}
