'use client'
// ══════════════════════════════════════════════════════════════════
// Graphiques de la stratégie nutrition — SVG RAW (règle projet : zéro lib de
// chart). Courbe poids cible vs réel, fluctuation des macros/kcal par semaine,
// jauges de la semaine courante. Thème via tokens ; couleurs macro assumées.
// ══════════════════════════════════════════════════════════════════
import type { WeekTarget } from '@/lib/nutrition/strategy'

const C_KCAL = '#22d3ee', C_PROT = '#ef4444', C_GLUC = '#f59e0b', C_LIP = '#a855f7', C_TARGET = '#22c55e', C_REAL = '#3b82f6'

export interface WeightPoint { date: string; kg: number }

// ── Courbe de poids : trajectoire CIBLE (ligne) + poids RÉEL loggé (points) ──
export function WeightTrajectoryChart({ weeks, actual, startWeight }: { weeks: WeekTarget[]; actual: WeightPoint[]; startWeight: number }) {
  const W = 640, H = 220, PL = 44, PR = 16, PT = 16, PB = 26
  const target = weeks.map((w, i) => ({ x: i, kg: w.weightKg }))
  const allKg = [startWeight, ...target.map(t => t.kg), ...actual.map(a => a.kg)].filter(v => v > 0)
  if (target.length < 1) return null
  const minKg = Math.floor(Math.min(...allKg) - 1), maxKg = Math.ceil(Math.max(...allKg) + 1)
  const rg = maxKg - minKg || 1
  const nW = Math.max(1, weeks.length - 1)
  const px = (i: number) => PL + (i / nW) * (W - PL - PR)
  const py = (kg: number) => PT + (1 - (kg - minKg) / rg) * (H - PT - PB)
  const targetPath = target.map((t, i) => `${i === 0 ? 'M' : 'L'}${px(t.x).toFixed(1)},${py(t.kg).toFixed(1)}`).join(' ')

  // Poids réel positionné par date sur l'axe des semaines (semaine 0 = début).
  const start = actual.length ? new Date(actual[0].date).getTime() : Date.now()
  const realPts = actual.map(a => {
    const wIdx = (new Date(a.date).getTime() - start) / (7 * 86400000)
    return { x: Math.max(0, Math.min(nW, wIdx)), kg: a.kg }
  })

  const yTicks = [minKg, Math.round((minKg + maxKg) / 2), maxKg]
  return (
    <div>
      <ChartTitle>Poids — trajectoire cible <Dot c={C_TARGET} /> vs réel <Dot c={C_REAL} /></ChartTitle>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: 'block' }}>
          {yTicks.map((v, k) => (
            <g key={k}>
              <line x1={PL} y1={py(v)} x2={W - PR} y2={py(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={PL - 6} y={py(v) + 3} textAnchor="end" fontSize={9} fill="var(--text-dim)">{v}</text>
            </g>
          ))}
          <path d={targetPath} fill="none" stroke={C_TARGET} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
          {realPts.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.kg)} r={3.2} fill={C_REAL} />)}
          {realPts.length > 1 && <path d={realPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)},${py(p.kg).toFixed(1)}`).join(' ')} fill="none" stroke={C_REAL} strokeWidth={1.5} opacity={0.55} strokeDasharray="4 3" />}
          <text x={PL} y={H - 8} fontSize={9} fill="var(--text-dim)">S1</text>
          <text x={W - PR} y={H - 8} textAnchor="end" fontSize={9} fill="var(--text-dim)">S{weeks.length}</text>
        </svg>
      </div>
    </div>
  )
}

// ── Fluctuation kcal + macros par semaine (barres empilées macros + ligne kcal) ──
export function MacroFluctuationChart({ weeks }: { weeks: WeekTarget[] }) {
  const W = 640, H = 220, PL = 44, PR = 40, PT = 16, PB = 26
  if (!weeks.length) return null
  const maxKcal = Math.max(...weeks.map(w => w.kcal)) * 1.1 || 1
  const maxG = Math.max(...weeks.map(w => w.proteines + w.glucides + w.lipides)) * 1.1 || 1
  const bw = (W - PL - PR) / weeks.length
  const barW = Math.min(30, bw * 0.6)
  const gy = (g: number) => PT + (1 - g / maxG) * (H - PT - PB)
  const ky = (k: number) => PT + (1 - k / maxKcal) * (H - PT - PB)
  const cx = (i: number) => PL + bw * i + bw / 2
  return (
    <div>
      <ChartTitle>Semaine par semaine — Protéines <Dot c={C_PROT} /> Glucides <Dot c={C_GLUC} /> Lipides <Dot c={C_LIP} /> · kcal <Dot c={C_KCAL} /></ChartTitle>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: 'block' }}>
          <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--border)" strokeWidth={1} />
          {weeks.map((w, i) => {
            const x = cx(i) - barW / 2
            const hP = (w.proteines / maxG) * (H - PT - PB)
            const hG = (w.glucides / maxG) * (H - PT - PB)
            const hL = (w.lipides / maxG) * (H - PT - PB)
            let yb = H - PB
            const segs = [
              { h: hP, c: C_PROT }, { h: hG, c: C_GLUC }, { h: hL, c: C_LIP },
            ]
            return (
              <g key={i}>
                {segs.map((s, k) => { yb -= s.h; return <rect key={k} x={x} y={yb} width={barW} height={Math.max(0, s.h)} fill={s.c} opacity={0.9} rx={1} /> })}
                <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--text-dim)">S{i + 1}</text>
              </g>
            )
          })}
          {/* Ligne kcal (axe droit) */}
          <path d={weeks.map((w, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${ky(w.kcal).toFixed(1)}`).join(' ')} fill="none" stroke={C_KCAL} strokeWidth={2.2} strokeLinejoin="round" />
          {weeks.map((w, i) => <circle key={i} cx={cx(i)} cy={ky(w.kcal)} r={2.6} fill={C_KCAL} />)}
          <text x={W - PR + 4} y={ky(maxKcal) + 8} fontSize={8.5} fill={C_KCAL}>{Math.round(maxKcal)}</text>
        </svg>
      </div>
    </div>
  )
}

// ── Jauges de la semaine courante ──
export function MacroGauges({ week }: { week: WeekTarget }) {
  const items = [
    { label: 'kcal', value: week.kcal, unit: '', c: C_KCAL, max: week.kcal },
    { label: 'Protéines', value: week.proteines, unit: 'g', c: C_PROT, max: week.proteines },
    { label: 'Glucides', value: week.glucides, unit: 'g', c: C_GLUC, max: week.glucides },
    { label: 'Lipides', value: week.lipides, unit: 'g', c: C_LIP, max: week.lipides },
  ]
  const kcalFromMacros = week.proteines * 4 + week.glucides * 4 + week.lipides * 9
  return (
    <div>
      <ChartTitle>Cibles — semaine {week.i + 1}</ChartTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {items.map(it => {
          const pctOfKcal = it.label === 'kcal' ? 100 : Math.round(((it.label === 'Lipides' ? it.value * 9 : it.value * 4) / (kcalFromMacros || 1)) * 100)
          return (
            <div key={it.label} style={{ textAlign: 'center' }}>
              <Ring color={it.c} pct={it.label === 'kcal' ? 100 : pctOfKcal} label={`${Math.round(it.value)}${it.unit}`} />
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4 }}>{it.label}{it.label !== 'kcal' && ` · ${pctOfKcal}%`}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Ring({ color, pct, label }: { color: string; pct: number; label: string }) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <svg viewBox="0 0 64 64" width={64} height={64} style={{ display: 'inline-block' }}>
      <circle cx={32} cy={32} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={7} />
      <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 32 32)" />
      <text x={32} y={36} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--text)">{label}</text>
    </svg>
  )
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>{children}</div>
}
function Dot({ c }: { c: string }) { return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: c }} /> }
