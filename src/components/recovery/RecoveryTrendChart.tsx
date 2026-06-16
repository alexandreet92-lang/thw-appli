'use client'

// ══════════════════════════════════════════════════════════════
// RecoveryTrendChart — graphe multi-courbes interactif (Vue d'ensemble
// Récupération). SVG raw, normalisation par série, bande KPI = toggles,
// navigation semaine (boutons + swipe), guide + tooltip au survol.
// Couleurs via variables CSS --rec-* / tokens DS (aucun hex en dur).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'

export type Serie = 'hrv' | 'sommeil' | 'readiness' | 'fc' | 'fatigue'
export interface WeekData {
  label: string                              // ex. '2 – 8 juin'
  values: Record<Serie, (number | null)[]>   // 7 valeurs, null si absent
}
interface Props { weeks: WeekData[] }

const SERIES: Record<Serie, { label: string; cssVar: string; unit: string; min: number; max: number; upGood: boolean; empty: string }> = {
  hrv:       { label: 'HRV',       cssVar: '--rec-hrv',       unit: ' ms',  min: 40, max: 80, upGood: true,  empty: 'à venir' },
  sommeil:   { label: 'Sommeil',   cssVar: '--rec-sommeil',   unit: ' h',   min: 5,  max: 9,  upGood: true,  empty: 'en attente Polar' },
  readiness: { label: 'Readiness', cssVar: '--rec-readiness', unit: '',     min: 0,  max: 100, upGood: true,  empty: 'via check-in' },
  fc:        { label: 'FC repos',  cssVar: '--rec-fc',        unit: ' bpm', min: 45, max: 62, upGood: false, empty: 'à venir' },
  fatigue:   { label: 'Fatigue',   cssVar: '--rec-fatigue',   unit: '/10',  min: 0,  max: 10, upGood: false, empty: 'via check-in' },
}
const KEYS: Serie[] = ['hrv', 'sommeil', 'readiness', 'fc', 'fatigue']
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const W = 720, H = 300, PAD = { l: 46, r: 18, t: 24, b: 34 }
const NUM = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: "'zero' 0" }
const varRef = (k: Serie) => `var(${SERIES[k].cssVar})`
const xAt = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / 6
const yAt = (s: Serie, v: number) => H - PAD.b - ((v - SERIES[s].min) / (SERIES[s].max - SERIES[s].min)) * (H - PAD.t - PAD.b)
const fmt = (v: number) => (v % 1 !== 0 ? v.toFixed(1) : String(v))
const firstLast = (a: (number | null)[]) => ({
  f: a.find(v => v != null) ?? null,
  l: [...a].reverse().find(v => v != null) ?? null,
})

export default function RecoveryTrendChart({ weeks }: Props) {
  const [wIdx, setWIdx] = useState(Math.max(0, weeks.length - 1))
  const [visible, setVisible] = useState<Record<Serie, boolean>>(() => ({ hrv: true, sommeil: true, readiness: true, fc: true, fatigue: true }))
  const [colors, setColors] = useState<Record<Serie, string>>(() => Object.fromEntries(KEYS.map(k => [k, varRef(k)])) as Record<Serie, string>)
  const [hover, setHover] = useState<{ px: number; day: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const root = getComputedStyle(document.documentElement)
    setColors(Object.fromEntries(KEYS.map(k => [k, root.getPropertyValue(SERIES[k].cssVar).trim() || varRef(k)])) as Record<Serie, string>)
  }, [])

  const week = weeks[wIdx]
  const hasData = useMemo(() => Object.fromEntries(KEYS.map(k => [k, (week?.values[k] ?? []).some(v => v != null)])) as Record<Serie, boolean>, [week])
  const anyVisible = KEYS.some(k => visible[k] && hasData[k])

  function toggle(s: Serie) { if (hasData[s]) setVisible(p => ({ ...p, [s]: !p[s] })) }
  function isolate(s: Serie) {
    if (!hasData[s]) return
    const onlyThis = KEYS.every(k => visible[k] === (k === s))
    setVisible(onlyThis ? { hrv: true, sommeil: true, readiness: true, fc: true, fatigue: true } : (Object.fromEntries(KEYS.map(k => [k, k === s])) as Record<Serie, boolean>))
  }

  function onMove(e: React.MouseEvent) {
    const r = svgRef.current?.getBoundingClientRect(); if (!r) return
    const x = ((e.clientX - r.left) / r.width) * W
    const day = Math.max(0, Math.min(6, Math.round((x - PAD.l) / ((W - PAD.l - PAD.r) / 6))))
    setHover({ px: e.clientX - r.left, day })
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) setWIdx(i => Math.max(0, Math.min(weeks.length - 1, i + (dx < 0 ? 1 : -1))))
    touchX.current = null
  }

  if (!week) return null
  const gridY = [0, 0.25, 0.5, 0.75, 1].map(t => PAD.t + t * (H - PAD.t - PAD.b))

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      {/* Navigation semaine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Semaine du {week.label}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['‹', -1], ['›', 1]] as const).map(([g, d]) => {
            const disabled = wIdx + d < 0 || wIdx + d > weeks.length - 1
            return (
              <button key={g} disabled={disabled} onClick={() => setWIdx(i => i + d)} aria-label={d < 0 ? 'Semaine précédente' : 'Semaine suivante'}
                style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontSize: 16, lineHeight: 1, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1 }}>{g}</button>
            )
          })}
        </div>
      </div>

      {/* Bande KPI = toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        {KEYS.map(s => {
          const cfg = SERIES[s], on = visible[s], live = hasData[s]
          const { f, l } = firstLast(week.values[s])
          const delta = f != null && l != null ? l - f : 0
          const good = cfg.upGood ? delta > 0 : delta < 0
          const dColor = delta === 0 ? 'var(--text-dim)' : good ? 'var(--charge-low)' : 'var(--charge-hard)'
          return (
            <button key={s} onClick={() => toggle(s)} onDoubleClick={() => isolate(s)} disabled={!live} title={live ? cfg.label : cfg.empty}
              style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 12, cursor: live ? 'pointer' : 'default',
                background: live && on ? 'var(--bg-card2)' : 'transparent', border: '1px solid var(--border)',
                opacity: live ? (on ? 1 : 0.5) : 0.45 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: live ? colors[s] : 'var(--text-dim)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-mid)', fontWeight: 600 }}>{cfg.label}</span>
              </span>
              {live ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ ...NUM, fontWeight: 600, fontSize: 19, color: 'var(--text)' }}>{l != null ? fmt(l) : '—'}<span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>{cfg.unit}</span></span>
                  <span style={{ ...NUM, fontSize: 10.5, fontWeight: 600, color: dColor }}>{delta > 0 ? '+' : ''}{fmt(delta)}</span>
                </span>
              ) : (
                <span style={{ display: 'block', marginTop: 4 }}>
                  <span style={{ ...NUM, fontWeight: 600, fontSize: 19, color: 'var(--text-dim)' }}>—</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 500, color: 'var(--text-dim)' }}>{cfg.empty}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Graphe SVG */}
      <div style={{ position: 'relative', touchAction: 'pan-y' }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX }} onTouchEnd={onTouchEnd}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {gridY.map((y, i) => <line key={i} x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />)}
          {DAYS.map((d, i) => <text key={i} x={xAt(i)} y={H - PAD.b + 18} textAnchor="middle" fontSize={11} fill="var(--text-dim)">{d}</text>)}
          {hover && <line x1={xAt(hover.day)} x2={xAt(hover.day)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-dim)" strokeWidth={1} strokeDasharray="3 3" />}
          {KEYS.filter(s => visible[s] && hasData[s]).map(s => {
            const segs: string[] = []; let cur: string[] = []
            week.values[s].forEach((v, i) => {
              if (v == null) { if (cur.length) { segs.push(cur.join(' ')); cur = [] } }
              else cur.push(`${xAt(i)},${yAt(s, v)}`)
            })
            if (cur.length) segs.push(cur.join(' '))
            return (
              <g key={s}>
                {segs.map((p, i) => <polyline key={i} points={p} fill="none" stroke={colors[s]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
                {week.values[s].map((v, i) => v == null ? null : <circle key={i} cx={xAt(i)} cy={yAt(s, v)} r={hover?.day === i ? 4 : 2.5} fill={colors[s]} />)}
              </g>
            )
          })}
        </svg>

        {!anyVisible && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)' }}>Aucune donnée synchronisée — connecte une source (Garmin, Polar, Oura…)</span>
          </div>
        )}

        {hover && anyVisible && (
          <div style={{ position: 'absolute', top: 4, left: Math.min(hover.px + 12, W - 150), pointerEvents: 'none', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 10, padding: '8px 10px', boxShadow: 'var(--shadow)', zIndex: 3, minWidth: 120 }}>
            <p style={{ margin: '0 0 5px', fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>{DAYS[hover.day]} · {week.label}</p>
            {KEYS.filter(s => visible[s] && hasData[s]).map(s => {
              const v = week.values[s][hover.day]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: colors[s], flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-mid)', flex: 1 }}>{SERIES[s].label}</span>
                  <span style={{ ...NUM, fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{v == null ? '—' : fmt(v) + SERIES[s].unit}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
