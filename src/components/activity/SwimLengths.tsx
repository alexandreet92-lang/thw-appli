'use client'

// ══════════════════════════════════════════════════════════════════
// SwimLengths — nombre de longueurs estimé pour la natation.
// La longueur du bassin n'est pas fournie de façon fiable par la sync :
// l'athlète la saisit (25 / 33 / 50 m ou custom). Le nombre de longueurs
// est alors distance ÷ longueur de bassin (approximation assumée).
// Persistance localStorage par activité (aucune table dédiée — cf. CLAUDE.md
// « ne jamais toucher au schéma sans migration SQL explicite »).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

const PRESETS = [25, 33, 50]
const SWIM = 'var(--sport-swim)'

function lsGet(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try { const v = window.localStorage.getItem(key); return v ? (Number(v) || fallback) : fallback } catch { return fallback }
}
function lsSet(key: string, value: number) {
  if (typeof window !== 'undefined') try { window.localStorage.setItem(key, String(value)) } catch { /* ignore */ }
}

export function SwimLengths({ activityId, distanceM }: { activityId: string; distanceM: number | null }) {
  const key = `swim-pool-${activityId}`
  const defKey = 'swim-pool-default'
  const [pool, setPool] = useState<number>(25)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('25')

  useEffect(() => {
    const stored = lsGet(key, lsGet(defKey, 25))
    setPool(stored); setDraft(String(stored))
  }, [key])

  function save(v: number) {
    if (!v || v <= 0) return
    setPool(v); lsSet(key, v); lsSet(defKey, v); setEditing(false)
  }

  const lengths = distanceM && distanceM > 0 && pool > 0 ? Math.round(distanceM / pool) : null

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
            Bassin {pool} m{distanceM ? ` · ${(distanceM / 1000).toFixed(2)} km` : ''}
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            fontSize: 12, color: SWIM, background: 'none', border: '1px solid var(--border)',
            borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}>Bassin</button>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => save(p)} style={{
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
          <button onClick={() => save(Number(draft))} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', background: SWIM, color: 'white',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>OK</button>
        </div>
      )}
    </div>
  )
}
