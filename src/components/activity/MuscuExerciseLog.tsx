'use client'

// ══════════════════════════════════════════════════════════════════
// MuscuExerciseLog — journal d'exercices muscu saisi manuellement.
// Couvre le cas « séance NON enregistrée depuis l'app » : l'athlète saisit
// ses exercices (nom, séries, répétitions, charge, récup) et le nombre de
// circuits ; le nombre d'exercices est calculé automatiquement et affiché.
// Persistance localStorage par activité (aucune table dédiée — cf. CLAUDE.md
// « ne jamais toucher au schéma sans migration SQL explicite »).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Exo { id: string; name: string; sets: string; reps: string; load: string; rest: string }
interface Log { circuits: string; exos: Exo[] }

const GYM = 'var(--sport-gym)'
const EMPTY: Log = { circuits: '1', exos: [] }

function lsGet(key: string): Log {
  if (typeof window === 'undefined') return EMPTY
  try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) as Log : EMPTY } catch { return EMPTY }
}
function lsSet(key: string, value: Log) {
  if (typeof window !== 'undefined') try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}
function newExo(n: number): Exo {
  return { id: `exo-${n}-${Math.round(Math.random() * 1e6)}`, name: '', sets: '', reps: '', load: '', rest: '' }
}

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 9px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box',
}

export function MuscuExerciseLog({ activityId }: { activityId: string }) {
  const key = `muscu-log-${activityId}`
  const [log, setLog] = useState<Log>(EMPTY)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Log>(EMPTY)

  useEffect(() => { setLog(lsGet(key)) }, [key])

  const nbExos = log.exos.filter(e => e.name.trim()).length
  const nbCircuits = Math.max(1, Number(log.circuits) || 1)

  function openEditor() {
    const base = log.exos.length ? log : { ...log, exos: [newExo(0)] }
    setDraft(JSON.parse(JSON.stringify(base)) as Log); setOpen(true)
  }
  function save() {
    const cleaned: Log = { circuits: draft.circuits || '1', exos: draft.exos.filter(e => e.name.trim()) }
    setLog(cleaned); lsSet(key, cleaned); setOpen(false)
  }
  function patchExo(id: string, k: keyof Exo, v: string) {
    setDraft(d => ({ ...d, exos: d.exos.map(e => e.id === id ? { ...e, [k]: v } : e) }))
  }

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: 16, margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: nbExos ? 12 : 0 }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Exercices</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{nbExos || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Circuits</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{nbExos ? nbCircuits : '—'}</div>
          </div>
        </div>
        <button onClick={openEditor} style={{
          fontSize: 12, color: GYM, background: 'none', border: '1px solid var(--border)',
          borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
        }}>{nbExos ? 'Modifier' : 'Saisir'}</button>
      </div>

      {nbExos > 0 && (
        <div>
          {log.exos.filter(e => e.name.trim()).map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {[e.sets && e.reps ? `${e.sets}×${e.reps}` : (e.sets || e.reps), e.load, e.rest && `récup ${e.rest}`].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' /* design-allow-color */, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg)',
            borderRadius: '18px 18px 0 0', padding: 20, boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' /* design-allow-color */,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Exercices réalisés</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 20, padding: 4 }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nombre de circuits</span>
              <input type="number" min={1} value={draft.circuits} onChange={e => setDraft(d => ({ ...d, circuits: e.target.value }))} style={{ ...inputStyle, width: 70 }} />
            </div>

            {draft.exos.map((e, i) => (
              <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={e.name} onChange={ev => patchExo(e.id, 'name', ev.target.value)} placeholder={`Exercice ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => setDraft(d => ({ ...d, exos: d.exos.filter(x => x.id !== e.id) }))} aria-label="Supprimer" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', cursor: 'pointer', padding: '0 10px', fontSize: 16 }}>−</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  <input value={e.sets} onChange={ev => patchExo(e.id, 'sets', ev.target.value)} placeholder="Séries" style={inputStyle} />
                  <input value={e.reps} onChange={ev => patchExo(e.id, 'reps', ev.target.value)} placeholder="Reps" style={inputStyle} />
                  <input value={e.load} onChange={ev => patchExo(e.id, 'load', ev.target.value)} placeholder="Charge" style={inputStyle} />
                  <input value={e.rest} onChange={ev => patchExo(e.id, 'rest', ev.target.value)} placeholder="Récup" style={inputStyle} />
                </div>
              </div>
            ))}

            <button onClick={() => setDraft(d => ({ ...d, exos: [...d.exos, newExo(d.exos.length)] }))} style={{
              width: '100%', padding: '10px', borderRadius: 10, border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--text-dim)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
            }}>+ Ajouter un exercice</button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={save} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: GYM, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Enregistrer</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
