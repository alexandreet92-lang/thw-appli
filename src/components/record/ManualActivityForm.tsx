'use client'
// Création MANUELLE d'une activité — pour TOUS les sports (course, vélo, natation,
// muscu, etc.). L'athlète saisit lui-même les données. Écrit dans `activities`
// (pour apparaître dans le feed/analytics) ET `workout_sessions` (journal).
// Plein écran, portal sur body. Aucune donnée fabriquée : ce que l'utilisateur
// saisit est ce qui est enregistré.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface Props { onClose: () => void; onSaved?: () => void }

const SPORTS: { id: string; label: string }[] = [
  { id: 'running',  label: 'Course à pied' },
  { id: 'cycling',  label: 'Vélo' },
  { id: 'swimming', label: 'Natation' },
  { id: 'gym',      label: 'Musculation' },
  { id: 'hyrox',    label: 'Hyrox' },
  { id: 'rowing',   label: 'Aviron' },
  { id: 'hiking',   label: 'Randonnée' },
  { id: 'trail',    label: 'Trail' },
  { id: 'other',    label: 'Autre' },
]
const NO_DISTANCE = new Set(['gym', 'hyrox'])

const FB = 'var(--font-body)'
const FD = 'var(--font-display)'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, color: 'var(--text)', fontFamily: FB, boxSizing: 'border-box', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--text-mid)', marginBottom: 6, display: 'block',
}

function todayLocalISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function ManualActivityForm({ onClose, onSaved }: Props) {
  const [sport, setSport] = useState('running')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(todayLocalISO)
  const [h, setH] = useState('0')
  const [m, setM] = useState('45')
  const [s, setS] = useState('0')
  const [dist, setDist] = useState('')
  const [distUnit, setDistUnit] = useState<'km' | 'm'>('km')
  const [elev, setElev] = useState('')
  const [avgHr, setAvgHr] = useState('')
  const [rpe, setRpe] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasDistance = !NO_DISTANCE.has(sport)
  const durationSec = (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0)

  async function handleSave() {
    setError(null)
    if (durationSec <= 0) { setError('Renseigne une durée.'); return }
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Session expirée.'); setSaving(false); return }

      const distanceM = hasDistance && dist
        ? Math.round(parseFloat(dist.replace(',', '.')) * (distUnit === 'km' ? 1000 : 1))
        : 0
      const startedAt = new Date(when).toISOString()
      const avgSpeedMs = distanceM > 0 && durationSec > 0 ? distanceM / durationSec : 0
      const hr = avgHr ? parseInt(avgHr) : null
      const elevM = elev ? Math.round(parseFloat(elev.replace(',', '.'))) : 0
      const autoTitle = title.trim() || `${SPORTS.find(x => x.id === sport)?.label ?? 'Séance'} manuelle`

      // 1) activities (feed / analytics)
      await sb.from('activities').insert({
        user_id: user.id, sport_type: sport, title: autoTitle,
        started_at: startedAt, moving_time_s: durationSec, elapsed_time_s: durationSec,
        distance_m: distanceM, elevation_gain_m: elevM, avg_speed_ms: avgSpeedMs,
        average_heartrate: hr, provider: 'manual',
      })
      // 2) workout_sessions (journal)
      await sb.from('workout_sessions').insert({
        user_id: user.id, sport, started_at: startedAt, ended_at: startedAt,
        duration_seconds: durationSec, distance_m: distanceM, elevation_gain_m: elevM,
        avg_hr: hr, status: 'completed', title: autoTitle,
        rpe: rpe ? parseInt(rpe) : null, comment: comment.trim() || null,
      })

      onSaved?.()
      onClose()
    } catch (e) {
      console.error('[manual] save error:', e)
      setError("Échec de l'enregistrement. Réessaie.")
      setSaving(false)
    }
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <h1 style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, margin: 0 }}>Créer une activité</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Sport</label>
          <select value={sport} onChange={e => setSport(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            {SPORTS.map(sp => <option key={sp.id} value={sp.id}>{sp.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Titre</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Optionnel" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Date & heure</label>
          <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Durée</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: h, set: setH, u: 'h' }, { v: m, set: setM, u: 'min' }, { v: s, set: setS, u: 's' },
            ].map(({ v, set, u }) => (
              <div key={u} style={{ flex: 1, position: 'relative' }}>
                <input type="number" inputMode="numeric" value={v} onChange={e => set(e.target.value)} style={{ ...inputStyle, textAlign: 'center', paddingRight: 30 }} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mid)', pointerEvents: 'none' }}>{u}</span>
              </div>
            ))}
          </div>
        </div>

        {hasDistance && (
          <div>
            <label style={labelStyle}>Distance</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" inputMode="decimal" value={dist} onChange={e => setDist(e.target.value)} placeholder="0" style={{ ...inputStyle, flex: 1 }} />
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {(['km', 'm'] as const).map(u => (
                  <button key={u} onClick={() => setDistUnit(u)} style={{ padding: '0 16px', background: distUnit === u ? 'var(--primary)' : 'var(--input-bg)', color: distUnit === u ? 'var(--on-primary)' : 'var(--text-mid)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>{u}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {hasDistance && (
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Dénivelé + (m)</label>
              <input type="number" inputMode="numeric" value={elev} onChange={e => setElev(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>FC moy. (bpm)</label>
            <input type="number" inputMode="numeric" value={avgHr} onChange={e => setAvgHr(e.target.value)} placeholder="—" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>RPE /10</label>
            <input type="number" inputMode="numeric" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Commentaire</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Ressenti, contexte…" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--zone-5, #ef4444)', fontWeight: 600 }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 18px calc(env(safe-area-inset-bottom) + 16px)', flexShrink: 0 }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', height: 52, borderRadius: 14, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 16, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: FB }}>
          {saving ? 'Enregistrement…' : "Enregistrer l'activité"}
        </button>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}
