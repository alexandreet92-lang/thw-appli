'use client'

// ══════════════════════════════════════════════════════════════════
// SuiviCharts — graphes SVG bruts (aucune lib) pour l'onglet Suivi.
// Couleurs via tokens uniquement. Sémantique de charge = teinte de barre,
// jamais de surface ; cadrage santé neutre (pas de vert/rouge alarmiste).
// ══════════════════════════════════════════════════════════════════

import type { DayRow, TypeAdherence } from './suiviData'

const TYPE_COLOR: Record<string, string> = {
  low: 'var(--charge-low)', mid: 'var(--charge-mid)', hard: 'var(--charge-hard)',
}
const TYPE_LABEL: Record<string, string> = { low: 'Low', mid: 'Mid', hard: 'Hard' }
const FONT = 'var(--font-body)'

// ── Calories par jour : barre = consommé, trait pointillé = cible (si plan) ──
// Cliquable : chaque jour loggé ouvre le détail des repas (donuts + photos + ingrédients).
export function KcalTrendChart({ rows, onSelectDay }: { rows: DayRow[]; onSelectDay?: (date: string) => void }) {
  const logged = rows.filter(r => r.logged)
  if (!logged.length) return <Empty text="Aucune journée loggée sur la période. Renseigne tes repas dans l'onglet Aujourd'hui pour voir ta tendance." />
  const W = 320, H = 192, padB = 28, padT = 10, padL = 32
  const maxKcal = Math.max(...rows.map(r => r.kcal), ...rows.map(r => r.targetKcal ?? 0), 1)
  // Axe Y : graduations rondes tous les 1000 kcal.
  const yMax = Math.max(1000, Math.ceil(maxKcal / 1000) * 1000)
  const ticks: number[] = []
  for (let v = 0; v <= yMax; v += 1000) ticks.push(v)
  const n = rows.length
  const slot = (W - padL) / n
  const bw = Math.min(22, slot * 0.6)
  const yOf = (v: number) => padT + (1 - v / yMax) * (H - padB - padT)
  // Axe X : date jour/mois. On espace les étiquettes si la période est longue.
  const dm = (iso: string) => { const p = iso.split('-'); return `${p[2]}/${p[1]}` }
  const step = n <= 10 ? 1 : Math.ceil(n / 7)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Graduations Y (tous les 1000 kcal) + valeurs */}
      {ticks.map(v => (
        <g key={v}>
          <line x1={padL} y1={yOf(v)} x2={W} y2={yOf(v)} stroke="var(--border)" strokeWidth={1} opacity={0.4} />
          <text x={padL - 5} y={yOf(v) + 3} textAnchor="end" fontSize="8" fill="var(--text-dim)" fontFamily={FONT}>{v}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cx = padL + (i + 0.5) * slot
        const h = (r.kcal / yMax) * (H - padB - padT)
        const clickable = r.logged && !!onSelectDay
        return (
          <g key={r.date} style={{ cursor: clickable ? 'pointer' : 'default' }}
            onClick={clickable ? () => onSelectDay!(r.date) : undefined}>
            {/* zone cliquable sur toute la colonne */}
            <rect x={padL + i * slot} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
            <rect x={cx - bw / 2} y={H - padB - h} width={bw} height={h} rx={3}
              fill="var(--primary)" opacity={r.logged ? 0.85 : 0.1} />
            {r.targetKcal != null && r.targetKcal > 0 && (
              <line x1={cx - bw / 2 - 2} y1={yOf(r.targetKcal)} x2={cx + bw / 2 + 2} y2={yOf(r.targetKcal)}
                stroke="var(--text-mid)" strokeWidth={1.5} />
            )}
            {i % step === 0 && (
              <text x={cx} y={H - padB + 14} textAnchor="middle" fontSize="8.5" fill="var(--text-dim)" fontFamily={FONT}>{dm(r.date)}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Adhérence par type de jour : consommé (plein) vs cible (teinte claire) ──
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
            <text x={cx} y={H - padB + 14} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontFamily={FONT} fontWeight="600">{TYPE_LABEL[d.type]}</text>
            <text x={cx} y={H - padB - hCons - 4} textAnchor="middle" fontSize="9" fill="var(--text-mid)" fontFamily={FONT}>{d.consumedKcal}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Protéines (g/kg) dans le temps + bande cible NEUTRE 1,6–2,2 ──
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
      <rect x={0} y={y(2.2)} width={W} height={Math.max(0, y(1.6) - y(2.2))} fill="var(--text-mid)" opacity={0.08} />
      <line x1={0} y1={y(1.6)} x2={W} y2={y(1.6)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={0} y1={y(2.2)} x2={W} y2={y(2.2)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.gkg)} r={2} fill="var(--primary)" />)}
      <text x={4} y={y(1.9) + 3} fontSize="8" fill="var(--text-dim)" fontFamily={FONT}>cible 1,6–2,2 g/kg</text>
    </svg>
  )
}

// ── Hydratation : barres + repère d'objectif (2,5 L) ──
export function HydrationChart({ data }: { data: { date: string; liters: number }[] }) {
  const shown = data.filter(d => d.liters > 0)
  if (!shown.length) return <Empty text="Aucune hydratation loggée sur la période." />
  const W = 320, H = 130, padB = 16, padT = 8
  const goal = 2.5
  const maxL = Math.max(goal, ...data.map(d => d.liters)) * 1.05
  const bw = (W / data.length) * 0.6
  const goalY = padT + (1 - goal / maxL) * (H - padB - padT)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const cx = (i + 0.5) * (W / data.length)
        const h = (d.liters / maxL) * (H - padB - padT)
        return <rect key={d.date} x={cx - bw / 2} y={H - padB - h} width={bw} height={h} rx={2} fill="var(--primary)" opacity={d.liters > 0 ? 0.5 : 0.15} />
      })}
      <line x1={0} y1={goalY} x2={W} y2={goalY} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  )
}

// ── Régularité de logging : grille de carrés (loggé / non) ──
export function LoggingGrid({ rows }: { rows: DayRow[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {rows.map(r => (
        <span key={r.date} title={r.date}
          style={{ width: 12, height: 12, borderRadius: 3, background: r.logged ? 'var(--primary)' : 'var(--border)' }} />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '18px 4px', fontFamily: FONT }}>{text}</div>
}
