'use client'
// ══════════════════════════════════════════════════════════════════
// Rendu des graphes AVANCÉS émis par l'IA via ```thw-chart {json}```.
// Types : donut · gauge · radar · zones · pmc · curve. Chaque type est
// validé (champs requis) avant rendu — un JSON malformé renvoie null et
// retombe sur le graphe ligne/barre/aire hérité. Rendu INLINE (visible tout
// de suite), dans une carte titrée.
// ══════════════════════════════════════════════════════════════════
import { Donut, Gauge, Radar, PmcChart, DurationCurve, ZoneDistribution, type DonutSlice, type GaugeBand, type RadarSeries, type CurvePoint } from '@/components/charts'
import type { PmcPoint } from '@/lib/training/pmc'

type AdvSpec =
  | { type: 'donut'; title?: string; unit?: string; centerLabel?: string; centerValue?: string; slices: DonutSlice[] }
  | { type: 'gauge'; title?: string; value: number; min?: number; max?: number; unit?: string; color?: string; bands?: GaugeBand[]; invert?: boolean; valueText?: string }
  | { type: 'radar'; title?: string; axes: string[]; max?: number; series: RadarSeries[] }
  | { type: 'zones'; title?: string; seconds: number[]; target?: number[] }
  | { type: 'pmc'; title?: string; points: PmcPoint[] }
  | { type: 'curve'; title?: string; unit?: string; invertY?: boolean; points: CurvePoint[]; compare?: CurvePoint[] }

const ADV_TYPES = ['donut', 'gauge', 'radar', 'zones', 'pmc', 'curve']
const numArr = (a: unknown, len?: number): number[] | null => {
  if (!Array.isArray(a)) return null
  const out = a.map(x => Number(x)).filter(x => Number.isFinite(x))
  if (out.length !== a.length) return null
  return len != null && out.length !== len ? null : out
}

export function parseAdvancedSpec(raw: string): AdvSpec | null {
  let o: Record<string, unknown>
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object' || !ADV_TYPES.includes(o.type as string)) return null
  try {
    switch (o.type) {
      case 'donut': {
        const slices = Array.isArray(o.slices) ? (o.slices as DonutSlice[]).filter(s => s && typeof s.label === 'string' && Number.isFinite(Number(s.value))).map(s => ({ ...s, value: Number(s.value) })) : []
        return slices.length ? { type: 'donut', title: str(o.title), unit: str(o.unit), centerLabel: str(o.centerLabel ?? o.center_label), centerValue: str(o.centerValue ?? o.center_value), slices } : null
      }
      case 'gauge': {
        if (!Number.isFinite(Number(o.value))) return null
        const bands = Array.isArray(o.bands) ? (o.bands as GaugeBand[]).filter(b => Number.isFinite(Number(b.upTo)) && typeof b.color === 'string') : undefined
        return { type: 'gauge', title: str(o.title), value: Number(o.value), min: num(o.min), max: num(o.max), unit: str(o.unit), color: str(o.color), bands, invert: !!o.invert, valueText: str(o.valueText ?? o.value_text) }
      }
      case 'radar': {
        const axes = Array.isArray(o.axes) ? (o.axes as unknown[]).map(String) : []
        const series = Array.isArray(o.series) ? (o.series as RadarSeries[]).map(s => ({ label: String(s?.label ?? ''), color: s?.color, values: numArr(s?.values, axes.length) ?? [] })).filter(s => s.values.length === axes.length) : []
        return axes.length >= 3 && series.length ? { type: 'radar', title: str(o.title), axes, max: num(o.max), series } : null
      }
      case 'zones': {
        const seconds = numArr(o.seconds, 5); if (!seconds) return null
        const target = numArr(o.target, 5) ?? undefined
        return { type: 'zones', title: str(o.title), seconds, target }
      }
      case 'pmc': {
        const pts = Array.isArray(o.points) ? (o.points as PmcPoint[]).filter(p => p && typeof p.date === 'string' && Number.isFinite(Number(p.ctl))).map(p => ({ date: p.date, tss: Number(p.tss ?? 0), ctl: Number(p.ctl), atl: Number(p.atl), tsb: Number(p.tsb ?? (Number(p.ctl) - Number(p.atl))) })) : []
        return pts.length >= 2 ? { type: 'pmc', title: str(o.title), points: pts } : null
      }
      case 'curve': {
        const pts = Array.isArray(o.points) ? (o.points as CurvePoint[]).filter(p => Number.isFinite(Number(p?.t)) && Number.isFinite(Number(p?.v))).map(p => ({ t: Number(p.t), v: Number(p.v) })) : []
        const cmp = Array.isArray(o.compare) ? (o.compare as CurvePoint[]).filter(p => Number.isFinite(Number(p?.t)) && Number.isFinite(Number(p?.v))).map(p => ({ t: Number(p.t), v: Number(p.v) })) : undefined
        return pts.length >= 2 ? { type: 'curve', title: str(o.title), unit: str(o.unit), invertY: !!o.invertY, points: pts, compare: cmp } : null
      }
    }
  } catch { return null }
  return null
}
function str(v: unknown): string | undefined { return typeof v === 'string' ? v : undefined }
function num(v: unknown): number | undefined { return Number.isFinite(Number(v)) ? Number(v) : undefined }

export function AdvancedChartCard({ spec }: { spec: AdvSpec }) {
  return (
    <div style={{ margin: '12px auto', maxWidth: 560, width: '100%', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-card)', padding: 16, boxSizing: 'border-box' }}>
      {spec.title && <p style={{ margin: '0 0 12px', fontFamily: 'Syne, sans-serif', fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{spec.title}</p>}
      <AdvancedChart spec={spec} />
    </div>
  )
}

export function AdvancedChart({ spec }: { spec: AdvSpec }) {
  switch (spec.type) {
    case 'donut': return <Donut slices={spec.slices} unit={spec.unit} centerLabel={spec.centerLabel} centerValue={spec.centerValue} />
    case 'gauge': return <div style={{ display: 'flex', justifyContent: 'center' }}><Gauge value={spec.value} min={spec.min} max={spec.max} unit={spec.unit} label={spec.title ? undefined : ''} color={spec.color} bands={spec.bands} invert={spec.invert} valueText={spec.valueText} /></div>
    case 'radar': return <div style={{ display: 'flex', justifyContent: 'center' }}><Radar axes={spec.axes} series={spec.series} max={spec.max ?? 100} /></div>
    case 'zones': return <ZoneDistribution seconds={spec.seconds} target={spec.target} />
    case 'pmc': return <PmcChart points={spec.points} />
    case 'curve': return <DurationCurve series={spec.points} compare={spec.compare} unit={spec.unit} invertY={spec.invertY} />
  }
}
