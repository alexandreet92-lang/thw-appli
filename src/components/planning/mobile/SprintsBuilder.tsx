'use client'
// ══════════════════════════════════════════════════════════════════
// Builder SPRINTS (famille course « Sprints »). Trois types de blocs :
//   • Échauffement  — footing + sprints d'échauffement + gammes/éducatifs
//   • Sprint        — distance libre, temps cible (plage), progressivité,
//                     côte + pente, starting-blocks, récup, haies
//   • Escaliers     — nb marches, exo, répétitions (sans repos), repos entre blocs
// L'intensité est pilotée par les records sprint (Performance running).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import type { Block } from '@/app/planning/page'
import type { MBlock } from './blocks'
import { createClient } from '@/lib/supabase/client'
import { Card, FieldLabel, Segmented } from './ui'
import {
  SPRINT_DRILLS, newSprintWarmup, newSprint, newStairs, isSprintBlock, sprintSpeedKmh,
  sprintBlockMin, syncSprintBlock, type SprintBlock, type WarmupExt, type SprintExt, type StairsExt,
} from './sprintBlocks'

const SPRINT_PB_DISTS = [100, 150, 200, 300, 400]

function fmtSpeed(kmh: number): string { return kmh > 0 ? `${kmh.toFixed(1).replace('.', ',')} km/h` : '—' }
function perfToSec(t: string): number {
  if (!t) return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}

// Petit champ numérique compact (tokens éditoriaux).
function Num({ value, onChange, unit, w = 68, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; unit?: string; w?: number; step?: number; min?: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: w }}>
      <input type="number" value={Number.isFinite(value) ? value : ''} min={min} step={step}
        onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))} inputMode="numeric"
        className="se-tnum" style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: unit ? '8px 22px 8px 8px' : '8px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 14, fontWeight: 600, outline: 'none' }} />
      {unit && <span style={{ position: 'absolute', right: 7, fontSize: 9.5, color: 'var(--se-dim)', pointerEvents: 'none' }}>{unit}</span>}
    </div>
  )
}
function Txt({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 14, fontWeight: 500, outline: 'none' }} />
}
function Toggle({ on, onChange, accent, label }: { on: boolean; onChange: (b: boolean) => void; accent: string; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? accent : 'var(--se-rule)'}`, background: on ? accent : 'var(--se-card)', color: on ? '#fff' : 'var(--se-dim)', fontSize: 12, fontWeight: 700 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? '#fff' : 'var(--se-dim)' }} />{label}
    </button>
  )
}

// ── Profil d'intensité (SVG) ──────────────────────────────────────
function IntensityProfile({ blocks, accent }: { blocks: SprintBlock[]; accent: string }) {
  const bars = blocks.flatMap(b => {
    if (b.sx.kind === 'warmup') return [{ h: 22, rec: false }, { h: 60, rec: false }]
    if (b.sx.kind === 'sprint') return Array.from({ length: Math.max(1, b.sx.reps) }, () => ({ h: 100, rec: false }))
    return Array.from({ length: Math.max(1, b.sx.reps) }, () => ({ h: 88, rec: false }))
  })
  if (!bars.length) return null
  const W = 100, gap = 1.5, bw = (W - gap * (bars.length - 1)) / bars.length
  return (
    <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', gap: `${gap}%`, padding: '0 2px' }}>
      {bars.map((b, i) => (
        <div key={i} title={`${b.h}%`} style={{ width: `${bw}%`, height: `${b.h}%`, borderRadius: '3px 3px 0 0', background: accent, opacity: 0.28 + (b.h / 100) * 0.6 }} />
      ))}
    </div>
  )
}

// ── Cartes d'édition par type de bloc ─────────────────────────────
function WarmupCard({ x, on, accent }: { x: WarmupExt; on: (x: WarmupExt) => void; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Footing (min)</FieldLabel><Num value={x.easyRunMin} onChange={n => on({ ...x, easyRunMin: n })} w={90} unit="min" /></div>
        <div><FieldLabel>Allure footing</FieldLabel><Txt value={x.easyPace} onChange={v => on({ ...x, easyPace: v })} placeholder="6:00" /></div>
      </div>
      <div>
        <FieldLabel>Sprints d'échauffement</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Num value={x.wuReps} onChange={n => on({ ...x, wuReps: n })} w={58} /> <span style={{ color: 'var(--se-dim)', fontSize: 13 }}>×</span>
          <Num value={x.wuDistanceM} onChange={n => on({ ...x, wuDistanceM: n })} unit="m" w={78} />
          <span style={{ color: 'var(--se-dim)', fontSize: 12 }}>récup</span>
          <Num value={x.wuRecoverySec} onChange={n => on({ ...x, wuRecoverySec: n })} unit="s" w={72} />
        </div>
      </div>
      <div>
        <FieldLabel right={<button type="button" onClick={() => on({ ...x, drills: [...x.drills, { type: SPRINT_DRILLS[0], durationSec: 20 }] })} style={{ border: 'none', background: 'transparent', color: accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>+ gamme</button>}>Gammes / éducatifs</FieldLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {x.drills.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={d.type} onChange={e => on({ ...x, drills: x.drills.map((y, j) => j === i ? { ...y, type: e.target.value } : y) })}
                style={{ flex: 1, minWidth: 0, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 13, fontWeight: 500 }}>
                {SPRINT_DRILLS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <Num value={d.durationSec} onChange={n => on({ ...x, drills: x.drills.map((y, j) => j === i ? { ...y, durationSec: n } : y) })} unit="s" w={72} />
              <button type="button" onClick={() => on({ ...x, drills: x.drills.filter((_, j) => j !== i) })} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: 'pointer', fontSize: 15 }}>×</button>
            </div>
          ))}
          {!x.drills.length && <p style={{ margin: 0, fontSize: 12, color: 'var(--se-dim)' }}>Aucune gamme — ajoute-en avec « + gamme ».</p>}
        </div>
      </div>
    </div>
  )
}

function SprintCard({ x, on, accent, pbs }: { x: SprintExt; on: (x: SprintExt) => void; accent: string; pbs: Record<number, number> }) {
  const speed = sprintSpeedKmh(x.distanceM, x.tMinSec, x.tMaxSec)
  const pbSec = pbs[x.distanceM]
  const pbSpeed = pbSec ? (x.distanceM / pbSec) * 3.6 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Distance</FieldLabel><Num value={x.distanceM} onChange={n => on({ ...x, distanceM: n })} unit="m" w={90} step={10} /></div>
        <div><FieldLabel>Répétitions</FieldLabel><Num value={x.reps} onChange={n => on({ ...x, reps: n })} w={72} min={1} /></div>
      </div>
      <div>
        <FieldLabel right={<span className="se-tnum" style={{ fontSize: 11, fontWeight: 700, color: accent }}>≈ {fmtSpeed(speed)}</span>}>Temps cible (plage)</FieldLabel>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Num value={x.tMinSec} onChange={n => on({ ...x, tMinSec: n })} unit="s" w={78} step={0.5} />
          <span style={{ color: 'var(--se-dim)' }}>→</span>
          <Num value={x.tMaxSec} onChange={n => on({ ...x, tMaxSec: n })} unit="s" w={78} step={0.5} />
        </div>
        {pbSec > 0 && (
          <p className="se-tnum" style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--se-dim)' }}>
            Record {x.distanceM} m : {pbSec}s · {fmtSpeed(pbSpeed)}
            {speed > 0 && <span style={{ color: speed >= pbSpeed ? '#22c55e' : 'var(--se-dim)', marginLeft: 6 }}>({Math.round((speed / pbSpeed) * 100)} % du record)</span>}
          </p>
        )}
      </div>
      <div>
        <FieldLabel right={<span className="se-tnum" style={{ fontSize: 11, color: 'var(--se-dim)' }}>{x.progPct === 0 ? 'constant' : `+${x.progPct}% en fin`}</span>}>Progressivité (départ → fin)</FieldLabel>
        <Num value={x.progPct} onChange={n => on({ ...x, progPct: Math.min(100, n) })} unit="%" w={82} />
      </div>
      <div>
        <FieldLabel>Surface</FieldLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Segmented accent={accent} value={x.surface} onChange={v => on({ ...x, surface: v, gradientPct: v === 'flat' ? 0 : x.gradientPct || 5 })} options={[{ key: 'flat', label: 'Plat' }, { key: 'uphill', label: 'Côte' }]} />
          {x.surface === 'uphill' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Pente</span><Num value={x.gradientPct} onChange={n => on({ ...x, gradientPct: n })} unit="%" w={70} /></span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle on={x.startingBlocks} onChange={b => on({ ...x, startingBlocks: b })} accent={accent} label="Starting-blocks" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Récup</span><Num value={x.recoverySec} onChange={n => on({ ...x, recoverySec: n })} unit="s" w={74} step={5} /></span>
      </div>
      <div>
        <FieldLabel right={<button type="button" onClick={() => on({ ...x, hurdles: x.hurdles ? null : { count: 5, spacingM: 8, heightCm: 76 } })} style={{ border: 'none', background: 'transparent', color: accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{x.hurdles ? 'retirer' : '+ haies'}</button>}>Haies</FieldLabel>
        {x.hurdles && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Nb</span><Num value={x.hurdles.count} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, count: n } })} w={58} /></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Espac.</span><Num value={x.hurdles.spacingM} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, spacingM: n } })} unit="m" w={72} step={0.5} /></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Haut.</span><Num value={x.hurdles.heightCm} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, heightCm: n } })} unit="cm" w={78} /></span>
          </div>
        )}
      </div>
    </div>
  )
}

function StairsCard({ x, on }: { x: StairsExt; on: (x: StairsExt) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div><FieldLabel>Nom de l'exercice</FieldLabel><Txt value={x.exoName} onChange={v => on({ ...x, exoName: v })} placeholder="Montée 2 par 2" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Marches</FieldLabel><Num value={x.steps} onChange={n => on({ ...x, steps: n })} w={80} /></div>
        <div><FieldLabel>Répétitions</FieldLabel><Num value={x.reps} onChange={n => on({ ...x, reps: n })} w={72} min={1} /></div>
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--se-dim)' }}>Aucun repos entre les répétitions.</p>
      <div><FieldLabel>Repos entre blocs</FieldLabel><Num value={x.restBetweenSec} onChange={n => on({ ...x, restBetweenSec: n })} unit="s" w={82} step={5} /></div>
    </div>
  )
}

export function SprintsBuilder({ blocks, onChange, accent }: { blocks: MBlock[]; onChange: (b: Block[]) => void; accent: string }) {
  // Ne garde que les blocs sprint (une séance récupérée peut contenir d'autres blocs).
  const sBlocks = useMemo(() => (blocks as MBlock[]).filter(isSprintBlock) as SprintBlock[], [blocks])
  const [pbs, setPbs] = useState<Record<number, number>>({})

  // Records sprint de l'athlète (personal_records) → vitesse cible / comparaison.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('personal_records').select('distance_label, performance').eq('user_id', user.id).eq('sport', 'run')
        if (!alive || !data) return
        const map: Record<number, number> = {}
        for (const r of data as { distance_label: string; performance: string }[]) {
          const m = SPRINT_PB_DISTS.find(d => r.distance_label === `${d}m`)
          if (m) { const s = perfToSec(r.performance); if (s > 0 && (!map[m] || s < map[m])) map[m] = s }
        }
        setPbs(map)
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  const setBlock = (id: string, sx: WarmupExt | SprintExt | StairsExt) =>
    onChange(sBlocks.map(b => b.id === id ? syncSprintBlock({ ...b, sx }) : b) as Block[])
  const add = (b: SprintBlock) => onChange([...sBlocks, b] as Block[])
  const remove = (id: string) => onChange(sBlocks.filter(b => b.id !== id) as Block[])
  const move = (id: string, dir: -1 | 1) => {
    const i = sBlocks.findIndex(b => b.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= sBlocks.length) return
    const nb = [...sBlocks];[nb[i], nb[j]] = [nb[j], nb[i]]; onChange(nb as Block[])
  }

  const totalMin = sBlocks.reduce((s, b) => s + sprintBlockMin(b.sx), 0)
  const addBtn: React.CSSProperties = { flex: 1, padding: '12px 8px', borderRadius: 12, border: `1px solid ${accent}`, background: 'var(--se-card)', color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Profil d'intensité + total */}
      {sBlocks.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Profil d'intensité</span>
            <span className="se-tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--se-text)' }}>≈ {totalMin} min</span>
          </div>
          <IntensityProfile blocks={sBlocks} accent={accent} />
        </Card>
      )}

      {/* Liste des blocs */}
      {sBlocks.map((b, i) => (
        <Card key={b.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--se-text)' }}>
              {b.sx.kind === 'warmup' ? '🔥 Échauffement' : b.sx.kind === 'sprint' ? `⚡ Sprint ${b.sx.distanceM} m` : `🪜 Escaliers`}
            </span>
            <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1 }}>↑</button>
            <button type="button" onClick={() => move(b.id, 1)} disabled={i === sBlocks.length - 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === sBlocks.length - 1 ? 'default' : 'pointer', opacity: i === sBlocks.length - 1 ? 0.35 : 1 }}>↓</button>
            <button type="button" onClick={() => remove(b.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: '#ef4444', cursor: 'pointer' }}>×</button>
          </div>
          {b.sx.kind === 'warmup' && <WarmupCard x={b.sx} on={sx => setBlock(b.id, sx)} accent={accent} />}
          {b.sx.kind === 'sprint' && <SprintCard x={b.sx} on={sx => setBlock(b.id, sx)} accent={accent} pbs={pbs} />}
          {b.sx.kind === 'stairs' && <StairsCard x={b.sx} on={sx => setBlock(b.id, sx)} />}
        </Card>
      ))}

      {!sBlocks.length && (
        <p style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--se-dim)', textAlign: 'center' }}>Ajoute un bloc pour construire ta séance de sprints.</p>
      )}

      {/* Boutons d'ajout */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => add(newSprintWarmup())} style={addBtn}>🔥 Échauffement</button>
        <button type="button" onClick={() => add(newSprint())} style={addBtn}>⚡ Sprint</button>
        <button type="button" onClick={() => add(newStairs())} style={addBtn}>🪜 Escaliers</button>
      </div>
    </div>
  )
}
