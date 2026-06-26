'use client'

// ══════════════════════════════════════════════════════════════════
// SwimLengths — nombre de longueurs estimé pour la natation.
// La longueur du bassin n'est pas fournie de façon fiable par la sync :
// l'athlète la saisit (25 / 33 / 50 m ou custom). Le nombre de longueurs
// est alors distance ÷ longueur de bassin (approximation assumée).
// Persisté en base via activity_extras (RLS user-scoped, multi-appareils).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useActivityExtras } from '@/lib/activity/extras'

const PRESETS = [25, 33, 50]
const SWIM = 'var(--sport-swim)'

export function SwimLengths({ activityId, distanceM }: { activityId: string; distanceM: number | null }) {
  const { extras, loaded, save } = useActivityExtras(activityId)
  const pool = extras.pool_length_m ?? 25
  const isSet = extras.pool_length_m != null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('25')

  useEffect(() => { setDraft(String(extras.pool_length_m ?? 25)) }, [extras.pool_length_m])
  // Première saisie : on ouvre directement le sélecteur tant que rien n'est défini.
  useEffect(() => { if (loaded && extras.pool_length_m == null) setEditing(true) }, [loaded, extras.pool_length_m])

  function commit(v: number) {
    if (!v || v <= 0) return
    void save({ pool_length_m: v }); setEditing(false)
  }

  const lengths = isSet && distanceM && distanceM > 0 && pool > 0 ? Math.round(distanceM / pool) : null

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: 16, margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
            Longueurs
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>
            {lengths != null ? lengths : '—'}
            {lengths != null && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 6 }}>longueurs</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {isSet ? `Bassin ${pool} m` : 'Bassin non renseigné'}{distanceM ? ` · ${(distanceM / 1000).toFixed(2)} km` : ''}
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            fontSize: 12, color: SWIM, background: 'none', border: '1px solid var(--border)',
            borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}>{isSet ? 'Bassin' : 'Renseigner'}</button>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => commit(p)} style={{
              padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              border: `1px solid ${pool === p ? SWIM : 'var(--border)'}`,
              background: pool === p ? 'var(--bg-card)' : 'transparent',
              color: pool === p ? SWIM : 'var(--text-dim)',
            }}>{p} m</button>
          ))}
          <input
            type="number" min={1} value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="m"
            style={{ width: 64, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}
          />
          <button onClick={() => commit(Number(draft))} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', background: SWIM, color: 'white',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>OK</button>
        </div>
      )}
    </div>
  )
}
