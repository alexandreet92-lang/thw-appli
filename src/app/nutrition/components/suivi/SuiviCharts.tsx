'use client'

// ══════════════════════════════════════════════════════════════════
// SuiviCharts — graphes SVG bruts (aucune lib) pour l'onglet Suivi.
// ══════════════════════════════════════════════════════════════════

import type { DayRow, TypeAdherence } from './suiviData'

const TYPE_COLOR: Record<string, string> = { low: '#22c55e', mid: '#eab308', hard: '#ef4444' }
const TYPE_LABEL: Record<string, string> = { low: 'Low', mid: 'Mid', hard: 'Hard' }

// ── Adhérence par type de jour : consommé vs cible (barres groupées) ──
export function AdherenceByTypeChart({ data }: { data: TypeAdherence[] }) {
  const shown = data.filter(d => d.days > 0)
  if (!shown.length) return <Empty text="Pas encore de jours loggés avec un plan." />
  const maxV = Math.max(...shown.flatMap(d => [d.consumedKcal ?? 0, d.targetKcal ?? 0])) * 1.1 || 1
  const W = 320, H = 150, padB = 28, padT = 8, groupW = W / shown.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {shown.map((d, i) => {
        const cx = i * groupW + groupW / 2
        const bw = Math.min(26, groupW / 3.2)
        const hCons = ((d.consumedKcal ?? 0) / maxV) * (H - padB - padT)
        const hTar  = ((d.targetKcal ?? 0) / maxV) * (H - padB - padT)
        const color = TYPE_COLOR[d.type]
        return (
          <g key={d.type}>
            <rect x={cx - bw - 2} y={H - padB - hTar} width={bw} height={hTar} rx={2} fill={color} opacity={0.28} />
            <rect x={cx + 2} y={H - padB - hCons} width={bw} height={hCons} rx={2} fill={color} />
            <text x={cx} y={H - padB + 14} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontFamily="Syne,sans-serif" fontWeight="700">{TYPE_LABEL[d.type]}</text>
            <text x={cx} y={H - padB - hCons - 4} textAnchor="middle" fontSize="9" fill="var(--text-mid)" fontFamily="DM Mono,monospace">{d.consumedKcal}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Protéines (g/kg) dans le temps + zone cible 1,6–2,2 ──
export function ProteinGkgChart({ rows, weightKg }: { rows: DayRow[]; weightKg: number | null }) {
  if (!weightKg || weightKg <= 0) return <Empty text="Poids non renseigné dans le profil — g/kg indisponible." />
  const pts = rows.filter(r => r.logged).map(r => ({ date: r.date, gkg: +(r.prot / weightKg).toFixed(2) }))
  if (pts.length < 2) return <Empty text="Pas assez de jours loggés pour une tendance." />
  const W = 320, H = 150, padB = 18, padT = 8, padL = 4
  const maxG = Math.max(2.4, ...pts.map(p => p.gkg)) * 1.05
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL * 2)
  const y = (g: number) => padT + (1 - g / maxG) * (H - padB - padT)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.gkg).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* zone cible 1,6–2,2 */}
      <rect x={0} y={y(2.2)} width={W} height={Math.max(0, y(1.6) - y(2.2))} fill="#22c55e" opacity={0.12} />
      <line x1={0} y1={y(1.6)} x2={W} y2={y(1.6)} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1={0} y1={y(2.2)} x2={W} y2={y(2.2)} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 3" />
      <path d={line} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.gkg)} r={2} fill="#06B6D4" />)}
      <text x={4} y={y(1.9) + 3} fontSize="8" fill="#22c55e" fontFamily="DM Mono,monospace">cible 1,6–2,2</text>
    </svg>
  )
}

// ── Hydratation dans le temps (litres loggés par jour) ──
export function HydrationChart({ data }: { data: { date: string; liters: number }[] }) {
  const shown = data.filter(d => d.liters > 0)
  if (!shown.length) return <Empty text="Aucune hydratation loggée sur la période." />
  const W = 320, H = 130, padB = 16, padT = 8
  const maxL = Math.max(2.5, ...data.map(d => d.liters)) * 1.05
  const bw = (W / data.length) * 0.6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const cx = (i + 0.5) * (W / data.length)
        const h = (d.liters / maxL) * (H - padB - padT)
        return <rect key={d.date} x={cx - bw / 2} y={H - padB - h} width={bw} height={h} rx={2} fill="#0ea5e9" opacity={d.liters > 0 ? 0.85 : 0.2} />
      })}
    </svg>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '18px 4px', fontFamily: 'DM Sans,sans-serif' }}>{text}</div>
}
