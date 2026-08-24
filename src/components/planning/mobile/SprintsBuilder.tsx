'use client'
// ══════════════════════════════════════════════════════════════════
// Builder SPRINTS (famille course « Sprints »). Trois types de blocs :
//   • Échauffement  — footing + sprints d'échauffement + gammes/éducatifs
//   • Sprint        — distance libre, temps cible (plage), progressivité,
//                     côte + pente, starting-blocks, récup, haies
//   • Escaliers     — nb marches, exo, répétitions (sans repos), repos entre blocs
// Panneau « Temps de référence » (100/150/200/300/400 m) toujours affiché ;
// il pilote l'intensité. Sans emoji, contrôles steppers/chips.
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
function fmtSprintTime(sec: number): string {
  if (!(sec > 0)) return '—'
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : `${(Math.round(sec * 10) / 10).toString().replace('.', ',')} s`
}
function perfToSec(t: string): number {
  if (!t) return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}

// ── Icônes (SVG, aucun emoji) ─────────────────────────────────────
const IconWarm = ({ c }: { c: string }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
const IconSprint = ({ c }: { c: string }) => <svg width="17" height="17" viewBox="0 0 24 24" fill={c} stroke="none"><path d="M13 2L4.5 13.5H11L9 22l9.5-12H12l1-8z" /></svg>
const IconStairs = ({ c }: { c: string }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h4v-4h4v-4h4V8h4V4" /></svg>

// ── Stepper compact − valeur + ─────────────────────────────────────
function Step({ value, onChange, unit, step = 1, min = 0, w }: { value: number; onChange: (n: number) => void; unit?: string; step?: number; min?: number; w?: number }) {
  const btn: React.CSSProperties = { width: 30, height: 34, flexShrink: 0, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 17, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', padding: 0 }
  const round = (n: number) => Math.round(n / step) * step
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 34, width: w }}>
      <button type="button" onClick={() => onChange(Math.max(min, round(value - step)))} style={{ ...btn, borderRadius: '9px 0 0 9px', borderRight: 'none' }}>−</button>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', background: 'var(--se-card)', padding: '0 6px' }}>
        <input value={Number.isInteger(value) ? value : value} onChange={e => { const n = Number(e.target.value.replace(',', '.')); if (Number.isFinite(n)) onChange(Math.max(min, n)) }} inputMode="decimal"
          className="se-tnum" style={{ width: '100%', minWidth: 0, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 15, fontWeight: 700, padding: 0 }} />
        {unit && <span style={{ fontSize: 10, color: 'var(--se-dim)', marginLeft: 2, whiteSpace: 'nowrap' }}>{unit}</span>}
      </div>
      <button type="button" onClick={() => onChange(round(value + step))} style={{ ...btn, borderRadius: '0 9px 9px 0', borderLeft: 'none' }}>+</button>
    </div>
  )
}
function Txt({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 14, fontWeight: 500, outline: 'none' }} />
}
function Chip({ on, onClick, children, accent }: { on: boolean; onClick: () => void; children: React.ReactNode; accent: string }) {
  return <button type="button" onClick={onClick} style={{ padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: `1px solid ${on ? accent : 'var(--se-rule)'}`, background: on ? accent : 'var(--se-card)', color: on ? '#fff' : 'var(--se-dim)' }}>{children}</button>
}

// ── Panneau Temps de référence (toujours visible) ─────────────────
function ReferenceZones({ pbs }: { pbs: Record<number, number> }) {
  return (
    <Card style={{ padding: 14 }}>
      <p style={{ margin: '0 0 10px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Temps de référence</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SPRINT_PB_DISTS.length}, 1fr)`, gap: 8 }}>
        {SPRINT_PB_DISTS.map(d => {
          const sec = pbs[d]
          const kmh = sec > 0 ? (d / sec) * 3.6 : 0
          return (
            <div key={d} style={{ border: '1px solid var(--se-rule)', borderRadius: 10, padding: '9px 6px', textAlign: 'center', background: sec > 0 ? 'var(--se-card)' : 'transparent' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--se-dim)' }}>{d} m</div>
              <div className="se-tnum" style={{ fontSize: 15, fontWeight: 800, color: sec > 0 ? 'var(--se-text)' : 'var(--se-dim)', marginTop: 2 }}>{fmtSprintTime(sec)}</div>
              <div className="se-tnum" style={{ fontSize: 9.5, color: 'var(--se-dim)', marginTop: 1 }}>{sec > 0 ? fmtSpeed(kmh) : 'pas de données'}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Profil d'intensité (SVG) ──────────────────────────────────────
function IntensityProfile({ blocks, accent }: { blocks: SprintBlock[]; accent: string }) {
  const bars = blocks.flatMap(b => {
    if (b.sx.kind === 'warmup') return [{ h: 22 }, { h: 60 }]
    if (b.sx.kind === 'sprint') return Array.from({ length: Math.max(1, b.sx.reps) }, () => ({ h: 100 }))
    return Array.from({ length: Math.max(1, b.sx.reps) }, () => ({ h: 88 }))
  })
  if (!bars.length) return null
  const gap = 1.5, bw = (100 - gap * (bars.length - 1)) / bars.length
  return (
    <div style={{ height: 72, display: 'flex', alignItems: 'flex-end', gap: `${gap}%`, padding: '0 2px' }}>
      {bars.map((b, i) => <div key={i} style={{ width: `${bw}%`, height: `${b.h}%`, borderRadius: '3px 3px 0 0', background: accent, opacity: 0.28 + (b.h / 100) * 0.6 }} />)}
    </div>
  )
}

// ── Cartes d'édition ──────────────────────────────────────────────
function WarmupCard({ x, on, accent }: { x: WarmupExt; on: (x: WarmupExt) => void; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Footing</FieldLabel><Step value={x.easyRunMin} onChange={n => on({ ...x, easyRunMin: n })} unit="min" /></div>
        <div><FieldLabel>Allure footing</FieldLabel><Txt value={x.easyPace} onChange={v => on({ ...x, easyPace: v })} placeholder="6:00" /></div>
      </div>
      <div>
        <FieldLabel>Sprints d'échauffement</FieldLabel>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Step value={x.wuReps} onChange={n => on({ ...x, wuReps: n })} min={1} w={100} unit="×" />
          <Step value={x.wuDistanceM} onChange={n => on({ ...x, wuDistanceM: n })} unit="m" step={5} w={120} />
          <span style={{ fontSize: 11.5, color: 'var(--se-dim)', fontWeight: 600 }}>récup</span>
          <Step value={x.wuRecoverySec} onChange={n => on({ ...x, wuRecoverySec: n })} unit="s" step={5} w={110} />
        </div>
      </div>
      <div>
        <FieldLabel>Gammes / éducatifs</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: x.drills.length ? 12 : 0 }}>
          {SPRINT_DRILLS.map(g => {
            const on2 = x.drills.some(d => d.type === g)
            return <Chip key={g} accent={accent} on={on2} onClick={() => on({ ...x, drills: on2 ? x.drills.filter(d => d.type !== g) : [...x.drills, { type: g, durationSec: 20 }] })}>{g}</Chip>
          })}
        </div>
        {x.drills.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {x.drills.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--se-text)' }}>{d.type}</span>
                <Step value={d.durationSec} onChange={n => on({ ...x, drills: x.drills.map((y, j) => j === i ? { ...y, durationSec: n } : y) })} unit="s" step={5} w={110} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SprintCard({ x, on, accent, pbs }: { x: SprintExt; on: (x: SprintExt) => void; accent: string; pbs: Record<number, number> }) {
  const speed = sprintSpeedKmh(x.distanceM, x.tMinSec, x.tMaxSec)
  const pbSec = pbs[x.distanceM]
  const pbSpeed = pbSec ? (x.distanceM / pbSec) * 3.6 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Distance</FieldLabel><Step value={x.distanceM} onChange={n => on({ ...x, distanceM: n })} unit="m" step={10} /></div>
        <div><FieldLabel>Répétitions</FieldLabel><Step value={x.reps} onChange={n => on({ ...x, reps: n })} min={1} /></div>
      </div>
      <div>
        <FieldLabel right={<span className="se-tnum" style={{ fontSize: 11, fontWeight: 700, color: accent }}>≈ {fmtSpeed(speed)}</span>}>Temps cible (plage)</FieldLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Step value={x.tMinSec} onChange={n => on({ ...x, tMinSec: n })} unit="s" step={0.5} w={110} />
          <span style={{ color: 'var(--se-dim)' }}>→</span>
          <Step value={x.tMaxSec} onChange={n => on({ ...x, tMaxSec: n })} unit="s" step={0.5} w={110} />
        </div>
        {pbSec > 0 && (
          <p className="se-tnum" style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--se-dim)' }}>
            Record {x.distanceM} m : {fmtSprintTime(pbSec)} · {fmtSpeed(pbSpeed)}
            {speed > 0 && <span style={{ color: speed >= pbSpeed ? '#16a34a' : 'var(--se-dim)', marginLeft: 6 }}>({Math.round((speed / pbSpeed) * 100)} % du record)</span>}
          </p>
        )}
      </div>
      <div>
        <FieldLabel right={<span className="se-tnum" style={{ fontSize: 11, color: 'var(--se-dim)' }}>{x.progPct === 0 ? 'constant' : `+${x.progPct}% en fin`}</span>}>Progressivité (départ → fin)</FieldLabel>
        <Step value={x.progPct} onChange={n => on({ ...x, progPct: Math.min(100, n) })} unit="%" step={5} w={130} />
      </div>
      <div>
        <FieldLabel>Surface</FieldLabel>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Segmented accent={accent} value={x.surface} onChange={v => on({ ...x, surface: v, gradientPct: v === 'flat' ? 0 : x.gradientPct || 5 })} options={[{ key: 'flat', label: 'Plat' }, { key: 'uphill', label: 'Côte' }]} />
          {x.surface === 'uphill' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 11.5, color: 'var(--se-dim)', fontWeight: 600 }}>Pente</span><Step value={x.gradientPct} onChange={n => on({ ...x, gradientPct: n })} unit="%" w={110} /></span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip accent={accent} on={x.startingBlocks} onClick={() => on({ ...x, startingBlocks: !x.startingBlocks })}>Starting-blocks</Chip>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 11.5, color: 'var(--se-dim)', fontWeight: 600 }}>Récup</span><Step value={x.recoverySec} onChange={n => on({ ...x, recoverySec: n })} unit="s" step={5} w={110} /></span>
      </div>
      <div>
        <FieldLabel right={<Chip accent={accent} on={!!x.hurdles} onClick={() => on({ ...x, hurdles: x.hurdles ? null : { count: 5, spacingM: 8, heightCm: 76 } })}>{x.hurdles ? 'Haies activées' : 'Ajouter des haies'}</Chip>}>Haies</FieldLabel>
        {x.hurdles && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Nb</span><Step value={x.hurdles.count} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, count: n } })} min={1} w={90} /></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Espac.</span><Step value={x.hurdles.spacingM} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, spacingM: n } })} unit="m" step={0.5} w={110} /></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--se-dim)' }}>Haut.</span><Step value={x.hurdles.heightCm} onChange={n => on({ ...x, hurdles: { ...x.hurdles!, heightCm: n } })} unit="cm" w={120} /></span>
          </div>
        )}
      </div>
    </div>
  )
}

function StairsCard({ x, on }: { x: StairsExt; on: (x: StairsExt) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><FieldLabel>Nom de l'exercice</FieldLabel><Txt value={x.exoName} onChange={v => on({ ...x, exoName: v })} placeholder="Montée 2 par 2" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><FieldLabel>Marches</FieldLabel><Step value={x.steps} onChange={n => on({ ...x, steps: n })} /></div>
        <div><FieldLabel>Répétitions</FieldLabel><Step value={x.reps} onChange={n => on({ ...x, reps: n })} min={1} /></div>
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--se-dim)' }}>Aucun repos entre les répétitions.</p>
      <div><FieldLabel>Repos entre blocs</FieldLabel><Step value={x.restBetweenSec} onChange={n => on({ ...x, restBetweenSec: n })} unit="s" step={5} w={130} /></div>
    </div>
  )
}

// ── Bouton d'ajout « évolué » (icône + titre + sous-titre) ─────────
function AddBtn({ icon, title, sub, accent, onClick }: { icon: React.ReactNode; title: string; sub: string; accent: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '13px 14px', borderRadius: 14, border: `1px solid var(--se-rule)`, background: 'var(--se-card)', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: `${accent}18` }}>{icon}</span>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13.5, fontWeight: 700, color: 'var(--se-text)' }}>{title}</span>
      <span style={{ fontSize: 10.5, color: 'var(--se-dim)', lineHeight: 1.25 }}>{sub}</span>
    </button>
  )
}

export function SprintsBuilder({ blocks, onChange, accent }: { blocks: MBlock[]; onChange: (b: Block[]) => void; accent: string }) {
  const sBlocks = useMemo(() => (blocks as MBlock[]).filter(isSprintBlock) as SprintBlock[], [blocks])
  const [pbs, setPbs] = useState<Record<number, number>>({})

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ReferenceZones pbs={pbs} />

      {sBlocks.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Profil d'intensité</span>
            <span className="se-tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--se-text)' }}>≈ {totalMin} min</span>
          </div>
          <IntensityProfile blocks={sBlocks} accent={accent} />
        </Card>
      )}

      {sBlocks.map((b, i) => (
        <Card key={b.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: `${accent}18`, flexShrink: 0 }}>
              {b.sx.kind === 'warmup' ? <IconWarm c={accent} /> : b.sx.kind === 'sprint' ? <IconSprint c={accent} /> : <IconStairs c={accent} />}
            </span>
            <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--se-text)' }}>
              {b.sx.kind === 'warmup' ? 'Échauffement' : b.sx.kind === 'sprint' ? `Sprint ${b.sx.distanceM} m` : 'Escaliers'}
            </span>
            <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1 }}>↑</button>
            <button type="button" onClick={() => move(b.id, 1)} disabled={i === sBlocks.length - 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === sBlocks.length - 1 ? 'default' : 'pointer', opacity: i === sBlocks.length - 1 ? 0.35 : 1 }}>↓</button>
            <button type="button" onClick={() => remove(b.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: '#dc2626', cursor: 'pointer' }}>×</button>
          </div>
          {b.sx.kind === 'warmup' && <WarmupCard x={b.sx} on={sx => setBlock(b.id, sx)} accent={accent} />}
          {b.sx.kind === 'sprint' && <SprintCard x={b.sx} on={sx => setBlock(b.id, sx)} accent={accent} pbs={pbs} />}
          {b.sx.kind === 'stairs' && <StairsCard x={b.sx} on={sx => setBlock(b.id, sx)} />}
        </Card>
      ))}

      {!sBlocks.length && (
        <p style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--se-dim)', textAlign: 'center' }}>Ajoute un bloc pour construire ta séance de sprints.</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <AddBtn accent={accent} onClick={() => add(newSprintWarmup())} icon={<IconWarm c={accent} />} title="Échauffement" sub="Footing + gammes + sprints" />
        <AddBtn accent={accent} onClick={() => add(newSprint())} icon={<IconSprint c={accent} />} title="Sprint" sub="Distance, temps cible, haies" />
        <AddBtn accent={accent} onClick={() => add(newStairs())} icon={<IconStairs c={accent} />} title="Escaliers" sub="Marches, répétitions" />
      </div>
    </div>
  )
}
