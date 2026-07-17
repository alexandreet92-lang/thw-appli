'use client'
// Builder des sports COMPOSÉS (Hybrid & Boxe) : on ajoute des « moves », chacun
// avec ses champs (watts, FC, vitesse, pente→dénivelé, niveau, rounds, combos…)
// et sa mesure (temps / distance / sauts / étages). Sortie = ComposedMove[].
import { useState } from 'react'
import { IconPlus, IconTrash, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import {
  type ComposedSport, type ComposedMove, type ComposedCircuit, type Measure, type RoundSupport, type Punch,
  movesForSport, moveDef, elevationFromIncline, runDistanceM, moveMinutes,
  ROUND_SUPPORT_LABEL, PUNCH_LABEL, SUPPORTS_WITH_COMBOS,
} from './composedSports'

const FB = 'var(--font-body)'
const MEASURE_LABEL: Record<Measure, string> = { time: 'Temps', distance: 'Distance', jumps: 'Sauts', floors: 'Étages' }

function uid() { return `mv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }
function mmss(sec: number): string { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function parseMmss(v: string): number { const m = v.match(/^(\d+):(\d{1,2})$/); if (m) return (+m[1]) * 60 + (+m[2]); const n = parseInt(v, 10); return isNaN(n) ? 0 : n * 60 }

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: FB, outline: 'none' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span style={lbl}>{label}</span>{children}</div>
}

// Segmented control générique.
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600,
          background: value === o.v ? 'var(--text)' : 'transparent', color: value === o.v ? 'var(--bg)' : 'var(--text-mid)',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

export function ComposedBuilder({ sport, moves, accent, onChange, circuit, onCircuitChange }: {
  sport: ComposedSport
  moves: ComposedMove[]
  accent: string
  onChange: (m: ComposedMove[]) => void
  circuit: ComposedCircuit
  onCircuitChange: (c: ComposedCircuit) => void
}) {
  const defs = movesForSport(sport)
  const isCircuit = circuit.rounds > 1

  function add(kind: string) {
    const d = moveDef(sport, kind); if (!d) return
    const m: ComposedMove = { id: uid(), kind, measure: d.defaultMeasure }
    if (d.fields.speedLevel) m.speedLevel = 26
    if (d.fields.paceWatts) m.paceWattsUnit = 'pace'
    if (d.fields.speed) m.speedUnit = 'kmh'
    if (d.fields.roundsRest) { m.rounds = 3; m.restSec = 60; m.timeSec = 180 }
    if (d.fields.roundSupport) m.roundSupport = 'bag'
    if (d.defaultMeasure === 'time') m.timeSec = m.timeSec ?? 300
    onChange([...moves, m])
  }
  function patch(id: string, p: Partial<ComposedMove>) {
    onChange(moves.map(m => {
      if (m.id !== id) return m
      const nx = { ...m, ...p }
      // Dénivelé auto (running) : distance = vitesse×temps si absente.
      if (nx.kind === 'run') {
        const dist = nx.distanceM ?? runDistanceM(nx.speedKmh, nx.timeSec)
        nx.elevationM = elevationFromIncline(dist, nx.inclinePct ?? 0)
      }
      return nx
    }))
  }
  function remove(id: string) { onChange(moves.filter(m => m.id !== id)) }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= moves.length) return
    const next = [...moves];[next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Circuit : tours + récup entre tours (toute la liste répétée) */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg-card2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Circuit</span>
          <Seg value={isCircuit ? 'on' : 'off'} options={[{ v: 'off', label: 'Non' }, { v: 'on', label: 'Oui' }]} onChange={v => onCircuitChange(v === 'on' ? { rounds: Math.max(2, circuit.rounds), restSec: circuit.restSec || 60 } : { rounds: 1, restSec: 0 })} />
        </div>
        {isCircuit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
            <Field label="Nb de tours"><input type="number" defaultValue={circuit.rounds} key={circuit.rounds} onBlur={e => onCircuitChange({ ...circuit, rounds: Math.max(1, +e.target.value || 1) })} style={inp} /></Field>
            <Field label="Récup / tour"><input defaultValue={mmss(circuit.restSec)} key={circuit.restSec} onBlur={e => onCircuitChange({ ...circuit, restSec: parseMmss(e.target.value) })} placeholder="m:ss" style={inp} /></Field>
          </div>
        )}
      </div>

      {moves.map((m, i) => {
        const d = moveDef(sport, m.kind); if (!d) return null
        return (
          <div key={m.id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: 12, background: 'var(--bg-card2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{d.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: 'DM Mono, monospace' }}>{moveMinutes(m) > 0 ? `${Math.round(moveMinutes(m))} min` : ''}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}><IconChevronUp size={16} /></button>
              <button onClick={() => move(i, 1)} disabled={i === moves.length - 1} aria-label="Descendre" style={{ ...iconBtn, opacity: i === moves.length - 1 ? 0.3 : 1 }}><IconChevronDown size={16} /></button>
              <button onClick={() => remove(m.id)} aria-label="Supprimer" style={{ ...iconBtn, color: '#ef4444' }}><IconTrash size={16} /></button>
            </div>

            {/* Mesure (si plusieurs choix) */}
            {d.measures.length > 1 && (
              <div style={{ marginBottom: 10 }}>
                <Seg value={m.measure} options={d.measures.map(x => ({ v: x, label: MEASURE_LABEL[x] }))} onChange={v => patch(m.id, { measure: v })} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {/* Mesures */}
              {(m.measure === 'time') && (
                <Field label={d.fields.roundsRest ? 'Durée / round' : 'Temps'}>
                  <input defaultValue={mmss(m.timeSec ?? 0)} key={m.timeSec} onBlur={e => patch(m.id, { timeSec: parseMmss(e.target.value) })} placeholder="m:ss" style={inp} />
                </Field>
              )}
              {m.measure === 'distance' && (
                <Field label="Distance (m)"><input type="number" defaultValue={m.distanceM ?? ''} key={m.distanceM} onBlur={e => patch(m.id, { distanceM: +e.target.value || undefined })} style={inp} /></Field>
              )}
              {m.measure === 'jumps' && (
                <Field label="Nb de sauts"><input type="number" defaultValue={m.jumps ?? ''} key={m.jumps} onBlur={e => patch(m.id, { jumps: +e.target.value || undefined })} style={inp} /></Field>
              )}
              {m.measure === 'floors' && (
                <Field label="Étages"><input type="number" defaultValue={m.floors ?? ''} key={m.floors} onBlur={e => patch(m.id, { floors: +e.target.value || undefined })} style={inp} /></Field>
              )}
              {/* étages → aussi un temps (climber : étages + temps) */}
              {m.measure === 'floors' && (
                <Field label="Temps"><input defaultValue={mmss(m.timeSec ?? 0)} key={`t${m.timeSec}`} onBlur={e => patch(m.id, { timeSec: parseMmss(e.target.value) })} placeholder="m:ss" style={inp} /></Field>
              )}

              {/* Champs cardio */}
              {d.fields.watts && <Field label="Watts"><input type="number" defaultValue={m.watts ?? ''} key={m.watts} onBlur={e => patch(m.id, { watts: +e.target.value || undefined })} style={inp} /></Field>}
              {d.fields.hr && <Field label="FC (bpm)"><input type="number" defaultValue={m.hr ?? ''} key={m.hr} onBlur={e => patch(m.id, { hr: +e.target.value || undefined })} style={inp} /></Field>}
              {d.fields.speedLevel && <Field label="Niveau vitesse"><input type="number" defaultValue={m.speedLevel ?? 26} key={m.speedLevel} onBlur={e => patch(m.id, { speedLevel: +e.target.value || undefined })} style={inp} /></Field>}

              {/* Rameur / SkiErg : min/500m OU watts */}
              {d.fields.paceWatts && (<>
                <Field label="Unité"><Seg value={m.paceWattsUnit ?? 'pace'} options={[{ v: 'pace', label: 'min/500m' }, { v: 'watts', label: 'Watts' }]} onChange={v => patch(m.id, { paceWattsUnit: v })} /></Field>
                {(m.paceWattsUnit ?? 'pace') === 'pace'
                  ? <Field label="Allure /500m"><input defaultValue={m.paceSec500 ? mmss(m.paceSec500) : ''} key={m.paceSec500} onBlur={e => patch(m.id, { paceSec500: parseMmss(e.target.value) || undefined })} placeholder="1:50" style={inp} /></Field>
                  : <Field label="Watts"><input type="number" defaultValue={m.watts ?? ''} key={`w${m.watts}`} onBlur={e => patch(m.id, { watts: +e.target.value || undefined })} style={inp} /></Field>}
              </>)}

              {/* Running : vitesse + pente */}
              {d.fields.speed && (<>
                <Field label="Vitesse"><Seg value={m.speedUnit ?? 'kmh'} options={[{ v: 'kmh', label: 'km/h' }, { v: 'minkm', label: 'min/km' }]} onChange={v => patch(m.id, { speedUnit: v })} /></Field>
                {(m.speedUnit ?? 'kmh') === 'kmh'
                  ? <Field label="km/h"><input type="number" step="0.1" defaultValue={m.speedKmh ?? ''} key={m.speedKmh} onBlur={e => patch(m.id, { speedKmh: +e.target.value || undefined })} style={inp} /></Field>
                  : <Field label="min/km"><input defaultValue={m.paceMinKm ?? ''} key={m.paceMinKm} onBlur={e => patch(m.id, { paceMinKm: e.target.value || undefined })} placeholder="5:00" style={inp} /></Field>}
              </>)}
              {d.fields.incline && (
                <Field label="Pente (%)"><input type="number" step="0.5" defaultValue={m.inclinePct ?? ''} key={m.inclinePct} onBlur={e => patch(m.id, { inclinePct: +e.target.value || undefined })} style={inp} /></Field>
              )}
              {d.fields.incline && (m.elevationM ?? 0) > 0 && (
                <Field label="Dénivelé (auto)"><div style={{ ...inp, background: 'var(--bg-card2)', color: accent, fontWeight: 700 }}>+{m.elevationM} m</div></Field>
              )}

              {/* Rounds + récup */}
              {d.fields.roundsRest && (<>
                <Field label="Nb de rounds"><input type="number" defaultValue={m.rounds ?? 3} key={m.rounds} onBlur={e => patch(m.id, { rounds: +e.target.value || 1 })} style={inp} /></Field>
                <Field label="Récup / round"><input defaultValue={mmss(m.restSec ?? 0)} key={m.restSec} onBlur={e => patch(m.id, { restSec: parseMmss(e.target.value) })} placeholder="m:ss" style={inp} /></Field>
              </>)}

              {/* Corde à sauter : simple / double */}
              {d.fields.doubleUnders && (
                <Field label="Type"><Seg value={m.doubleUnders ? 'double' : 'simple'} options={[{ v: 'simple', label: 'Simple' }, { v: 'double', label: 'Double' }]} onChange={v => patch(m.id, { doubleUnders: v === 'double' })} /></Field>
              )}
            </div>

            {/* Récup après l'exo (entre exos) */}
            <div style={{ marginTop: 10, maxWidth: 180 }}>
              <Field label="Récup après"><input defaultValue={mmss(m.restAfterSec ?? 0)} key={m.restAfterSec} onBlur={e => patch(m.id, { restAfterSec: parseMmss(e.target.value) })} placeholder="0:00" style={inp} /></Field>
            </div>

            {/* Support de round + combos */}
            {d.fields.roundSupport && (
              <div style={{ marginTop: 10 }}>
                <span style={lbl}>Support</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {(Object.keys(ROUND_SUPPORT_LABEL) as RoundSupport[]).map(rs => (
                    <button key={rs} onClick={() => patch(m.id, { roundSupport: rs })} style={{
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${m.roundSupport === rs ? accent : 'var(--border)'}`,
                      background: m.roundSupport === rs ? `${accent}18` : 'transparent',
                      color: m.roundSupport === rs ? accent : 'var(--text-mid)',
                    }}>{ROUND_SUPPORT_LABEL[rs]}</button>
                  ))}
                </div>
                {m.roundSupport && SUPPORTS_WITH_COMBOS.includes(m.roundSupport) && (
                  <ComboEditor combos={m.combos ?? []} accent={accent} onChange={c => patch(m.id, { combos: c })} />
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Ajouter un exercice */}
      <div>
        <span style={lbl}>Ajouter un exercice</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {defs.map(d => (
            <button key={d.kind} onClick={() => add(d.kind)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
              border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600,
            }}><IconPlus size={14} /> {d.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }

// Éditeur de combos : on assemble une suite de coups depuis les 4 coups, on l'ajoute.
function ComboEditor({ combos, accent, onChange }: { combos: string[]; accent: string; onChange: (c: string[]) => void }) {
  const [draft, setDraft] = useState<Punch[]>([])
  const PUNCHES: Punch[] = ['jab', 'direct', 'hook', 'uppercut']
  function addCombo() {
    if (draft.length === 0) return
    onChange([...combos, draft.map(p => PUNCH_LABEL[p]).join('-')])
    setDraft([])
  }
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
      <span style={lbl}>Combos</span>
      {combos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {combos.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 7, background: `${accent}14`, color: accent, fontSize: 12, fontWeight: 700, fontFamily: FB }}>
              {c}
              <button onClick={() => onChange(combos.filter((_, j) => j !== i))} aria-label="Retirer" style={{ border: 'none', background: 'transparent', color: accent, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {PUNCHES.map(p => (
          <button key={p} onClick={() => setDraft(d => [...d, p])} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600 }}>{PUNCH_LABEL[p]}</button>
        ))}
      </div>
      {draft.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{draft.map(p => PUNCH_LABEL[p]).join('-')}</span>
          <button onClick={() => setDraft([])} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}>Effacer</button>
          <button onClick={addCombo} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: accent, color: '#fff', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 700 }}>Ajouter</button>
        </div>
      )}
    </div>
  )
}
