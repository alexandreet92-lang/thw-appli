'use client'

// ══════════════════════════════════════════════════════════════
// CheckinTab — check-in subjectif quotidien (4 échelles 1-5).
// À la validation : upsert recovery_checkin + calcul readiness (fonction
// pure) → upsert health_data (data_type='readiness'). Prérempli si un
// check-in existe déjà aujourd'hui. Tokens DS uniquement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeReadiness, fatigueScore, type CheckinScales } from '@/lib/recovery/computeReadiness'

export interface ReadinessInputsLite {
  hrvToday: number | null
  hrvBaseline: number | null
  hrvNightsCount: number
  tsb: number | null
}

const FIELDS: { key: keyof CheckinScales; label: string; lo: string; hi: string }[] = [
  { key: 'sleepQuality', label: 'Qualité du sommeil', lo: 'mauvaise', hi: 'excellente' },
  { key: 'fatigue',      label: 'Fatigue',            lo: 'aucune',   hi: 'intense' },
  { key: 'soreness',     label: 'Courbatures',        lo: 'aucunes',  hi: 'intenses' },
  { key: 'mood',         label: 'Humeur',             lo: 'basse',    hi: 'excellente' },
]
const DEFAULT: CheckinScales = { sleepQuality: 3, fatigue: 3, soreness: 3, mood: 3 }

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Scale({ value, onChange, lo, hi }: { value: number; onChange: (n: number) => void; lo: string; hi: string }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const on = n === value
          return (
            <button key={n} onClick={() => onChange(n)} aria-label={`${n}`} style={{
              flex: 1, height: 38, borderRadius: 10, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600,
              background: on ? 'var(--primary-dim)' : 'var(--bg-card2)',
              border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
              color: on ? 'var(--primary)' : 'var(--text-mid)',
            }}>{n}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{lo}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{hi}</span>
      </div>
    </div>
  )
}

export default function CheckinTab({ initial, inputs, onSaved }: {
  initial: CheckinScales | null
  inputs: ReadinessInputsLite
  onSaved: () => void
}) {
  const [v, setV] = useState<CheckinScales>(initial ?? DEFAULT)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(initial != null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (initial) { setV(initial); setDone(true) } }, [initial])

  const preview = computeReadiness({ checkin: v, ...inputs })

  async function save() {
    setSaving(true); setErr(null)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); setErr('Session expirée'); return }
    const date = todayStr()

    const { error: e1 } = await sb.from('recovery_checkin').upsert(
      { user_id: user.id, date, sleep_quality: v.sleepQuality, fatigue: v.fatigue, soreness: v.soreness, mood: v.mood },
      { onConflict: 'user_id,date' },
    )
    const result = computeReadiness({ checkin: v, ...inputs })
    const { error: e2 } = await sb.from('health_data').upsert(
      {
        user_id: user.id, provider: 'manual', provider_id: `readiness_${date}`,
        measured_at: `${date}T12:00:00Z`, date, data_type: 'readiness',
        readiness_score: result.score, fatigue_level: fatigueScore(v.fatigue),
        raw_data: { components: result.components, checkin: v, source: 'recovery_checkin' },
      },
      { onConflict: 'user_id,provider,date,data_type' },
    )
    setSaving(false)
    if (e1 || e2) { setErr(e1?.message ?? e2?.message ?? 'Erreur d’enregistrement'); return }
    setDone(true); onSaved()
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Check-in du jour</h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: '0 0 18px' }}>
        {done ? 'Déjà enregistré aujourd’hui — tu peux le mettre à jour.' : 'Quelques secondes pour calculer ta readiness.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {FIELDS.map(f => (
          <div key={f.key}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{f.label}</p>
            <Scale value={v[f.key]} onChange={n => setV(prev => ({ ...prev, [f.key]: n }))} lo={f.lo} hi={f.hi} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-mid)' }}>
          Readiness estimée : <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>{preview.score ?? '—'}{preview.score != null ? '/100' : ''}</span>
        </span>
        <button onClick={save} disabled={saving} style={{
          padding: '10px 18px', borderRadius: 11, cursor: saving ? 'default' : 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
          background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Enregistrement…' : done ? 'Mettre à jour' : 'Valider le check-in'}</button>
      </div>
      {err && <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--charge-hard)', margin: '10px 0 0' }}>{err}</p>}
    </div>
  )
}
