'use client'
// ══════════════════════════════════════════════════════════════════
// WeeklyGoals — objectifs hebdomadaires PAR SPORT + série (streak).
//  • On voit chaque sport ; on clique sur un sport pour saisir les
//    objectifs pertinents (séances / volume horaire / distance).
//  • Chaque objectif a sa jauge de progression de la semaine en cours.
//  • La saisie s'ouvre dans une feuille coulissante (BottomSheet) qui
//    glisse du bas vers le haut, et se referme du haut vers le bas.
//  • Série : nombre de semaines consécutives « actives » (≥ 3 séances).
// Persisté en base (table training_goals, colonne per_sport, RLS user-scoped).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { IconFlame, IconChevronRight, IconPlus, IconTrash } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'

interface Act { started_at: string; sport_type: string; moving_time_s: number | null; distance_m: number | null }

type Metric = 'sessions' | 'distance' | 'hours'
type SportGoal = Partial<Record<Metric, number>>
type PerSport = Record<string, SportGoal>

// Sports objectivables + métriques pertinentes par sport.
const GOAL_SPORTS: { key: string; label: string; match: string[]; color: string; metrics: Metric[] }[] = [
  { key: 'run',    label: 'Course',   match: ['run', 'trail_run'],                    color: 'var(--sport-run)',    metrics: ['sessions', 'distance', 'hours'] },
  { key: 'bike',   label: 'Vélo',     match: ['bike', 'virtual_bike'],                color: 'var(--sport-bike)',   metrics: ['sessions', 'distance', 'hours'] },
  { key: 'swim',   label: 'Natation', match: ['swim'],                                color: 'var(--sport-swim)',   metrics: ['sessions', 'distance', 'hours'] },
  { key: 'rowing', label: 'Aviron',   match: ['rowing'],                              color: 'var(--sport-rowing)', metrics: ['sessions', 'distance', 'hours'] },
  { key: 'ski',    label: 'Ski',      match: ['ski', 'nordic_ski', 'backcountry_ski'],color: 'var(--zone-1)',       metrics: ['sessions', 'distance', 'hours'] },
  { key: 'gym',    label: 'Muscu',    match: ['gym'],                                 color: 'var(--sport-gym)',    metrics: ['sessions', 'hours'] },
  { key: 'hyrox',  label: 'Hyrox',    match: ['hyrox'],                               color: 'var(--sport-hyrox)',  metrics: ['sessions', 'hours'] },
]
type SportCfg = (typeof GOAL_SPORTS)[number]

const METRIC_META: Record<Metric, { label: string; unit: string; field: string; step: number }> = {
  sessions: { label: 'Séances',  unit: '',   field: 'Nombre de séances / semaine', step: 1 },
  distance: { label: 'Distance', unit: 'km', field: 'Distance / semaine (km)',     step: 1 },
  hours:    { label: 'Volume',   unit: 'h',  field: 'Volume horaire (h / semaine)', step: 0.5 },
}

const WEEK = 7 * 86400000
const ACTIVE = 3 // séances/semaine pour qu'une semaine compte dans la série

function weekStartOf(d: Date): number {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime()
}
const fmtNum = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))
const hasAny = (g: SportGoal | undefined) => !!g && (['sessions', 'distance', 'hours'] as Metric[]).some(m => (g[m] ?? 0) > 0)

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ── Jauge de progression (barre animée 0 → valeur) ────────────────
function Gauge({ metric, cur, goal, color }: { metric: Metric; cur: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (cur / goal) * 100) : 0
  const done = goal > 0 && cur >= goal
  const m = METRIC_META[metric]
  const [w, setW] = useState(0)
  useEffect(() => {
    if (prefersReduced()) { setW(pct); return }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setW(pct)))
    return () => cancelAnimationFrame(id)
  }, [pct])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 58, flexShrink: 0, fontSize: 11.5, color: 'var(--text-mid)' }}>{m.label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3, transition: prefersReduced() ? 'none' : 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
      <span style={{ width: 72, flexShrink: 0, textAlign: 'right', fontSize: 11.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: done ? color : 'var(--text)', fontWeight: 700 }}>{fmtNum(cur)}</span>
        <span style={{ color: 'var(--text-dim)' }}> / {fmtNum(goal)}{m.unit ? ` ${m.unit}` : ''}</span>
      </span>
    </div>
  )
}

// ── Champ de saisie (unité intégrée à droite) ─────────────────────
function Field({ metric, value, onChange }: { metric: Metric; value: number | undefined; onChange: (v: number | undefined) => void }) {
  const m = METRIC_META[metric]
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>{m.field}</label>
      <div style={{
        display: 'flex', alignItems: 'center', background: 'var(--input-bg)',
        border: `1px solid ${focus ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10,
        boxShadow: focus ? '0 0 0 3px var(--primary-dim)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <input
          type="number" inputMode="decimal" min={0} step={m.step}
          value={value ?? ''} placeholder="0"
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            padding: '11px 12px', fontSize: 15, color: 'var(--text)', fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums' }}
        />
        {m.unit && <span style={{ padding: '0 14px 0 4px', fontSize: 13, color: 'var(--text-dim)' }}>{m.unit}</span>}
      </div>
    </div>
  )
}

export function WeeklyGoals({ activities }: { activities: Act[] }) {
  const [perSport, setPerSport] = useState<PerSport>({})
  const [editKey, setEditKey] = useState<string | null>(null) // sport en cours d'édition (sheet ouvert)
  const [picking, setPicking] = useState(false)               // picker « ajouter un sport »
  const [draft, setDraft] = useState<SportGoal>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const sb = createClient()
        const { data } = await sb.from('training_goals').select('per_sport').maybeSingle()
        if (alive && data?.per_sport) setPerSport(data.per_sport as PerSport)
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  // Stats de la semaine en cours, par match de sport.
  const wk = useMemo(() => {
    const ws = weekStartOf(new Date())
    const inWeek = activities.filter(a => new Date(a.started_at).getTime() >= ws)
    return (match: string[]) => {
      const acts = inWeek.filter(a => match.includes(a.sport_type))
      return {
        sessions: acts.length,
        distance: Math.round((acts.reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000) * 10) / 10,
        hours: Math.round((acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0) / 3600) * 10) / 10,
      } as Record<Metric, number>
    }
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

  async function persist(next: PerSport) {
    setPerSport(next)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('training_goals').upsert({
        user_id: user.id, per_sport: next, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch { /* best-effort */ }
  }

  function openSport(key: string) {
    setPicking(false)
    setDraft(perSport[key] ?? {})
    setEditKey(key)
  }
  function saveDraft() {
    if (!editKey) return
    const clean: SportGoal = {}
    for (const m of ['sessions', 'distance', 'hours'] as Metric[]) if ((draft[m] ?? 0) > 0) clean[m] = draft[m]
    const next = { ...perSport }
    if (hasAny(clean)) next[editKey] = clean
    else delete next[editKey]
    void persist(next)
    setEditKey(null)
  }
  function removeSport(key: string) {
    const next = { ...perSport }; delete next[key]
    void persist(next)
    setEditKey(null)
  }

  const configured = GOAL_SPORTS.filter(s => hasAny(perSport[s.key]))
  const editCfg: SportCfg | undefined = GOAL_SPORTS.find(s => s.key === editKey)
  const pickable = GOAL_SPORTS.filter(s => !hasAny(perSport[s.key]))

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 16 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: configured.length ? 14 : 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>Objectifs hebdo</span>
        {streak > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--sport-gym)', background: 'var(--bg-card2)', padding: '3px 9px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>
            <IconFlame size={14} /> {streak} sem.
          </span>
        )}
      </div>

      {/* Tuiles de sport configurées */}
      {configured.map(s => {
        const goal = perSport[s.key]!
        const cur = wk(s.match)
        const mets = s.metrics.filter(m => (goal[m] ?? 0) > 0)
        return (
          <button
            key={s.key}
            onClick={() => openSport(s.key)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-card2)',
              border: 'none', borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
              <IconChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {mets.map(m => <Gauge key={m} metric={m} cur={cur[m]} goal={goal[m]!} color={s.color} />)}
            </div>
          </button>
        )
      })}

      {/* Ajouter / définir un objectif */}
      {pickable.length > 0 && (
        <button
          onClick={() => setPicking(true)}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: configured.length ? 4 : 0, fontFamily: 'inherit',
          }}
        >
          <IconPlus size={16} /> {configured.length ? 'Ajouter un sport' : 'Définir mes objectifs'}
        </button>
      )}

      {/* Sheet : picker de sport ───────────────────────────────── */}
      <BottomSheet isOpen={picking} onClose={() => setPicking(false)} title="Ajouter un objectif">
        <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 14px' }}>
          Choisis un sport, puis renseigne les objectifs qui te semblent pertinents.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {pickable.map(s => (
            <button
              key={s.key}
              onClick={() => openSport(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '14px', borderRadius: 12,
                background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              {s.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Sheet : édition d'un sport ─────────────────────────────── */}
      <BottomSheet
        isOpen={!!editCfg}
        onClose={() => setEditKey(null)}
        title={editCfg ? `Objectifs — ${editCfg.label}` : undefined}
        icon={editCfg ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: editCfg.color, display: 'inline-block' }} /> : undefined}
      >
        {editCfg && (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 16px' }}>
              Laisse un champ vide pour ne pas suivre cette métrique.
            </p>
            {editCfg.metrics.map(m => (
              <Field key={m} metric={m} value={draft[m]} onChange={v => setDraft(d => ({ ...d, [m]: v }))} />
            ))}
            <button
              onClick={saveDraft}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}
            >
              Enregistrer
            </button>
            {hasAny(perSport[editCfg.key]) && (
              <button
                onClick={() => removeSport(editCfg.key)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontWeight: 500, fontSize: 13, cursor: 'pointer', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
              >
                <IconTrash size={15} /> Supprimer cet objectif
              </button>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  )
}
