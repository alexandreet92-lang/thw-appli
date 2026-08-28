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
import { useI18n } from '@/lib/i18n'

type AdvSpec = (
  | { type: 'donut'; title?: string; unit?: string; centerLabel?: string; centerValue?: string; slices: DonutSlice[] }
  | { type: 'gauge'; title?: string; value: number; min?: number; max?: number; unit?: string; color?: string; bands?: GaugeBand[]; invert?: boolean; valueText?: string }
  | { type: 'radar'; title?: string; axes: string[]; max?: number; series: RadarSeries[] }
  | { type: 'zones'; title?: string; seconds: number[]; target?: number[] }
  | { type: 'pmc'; title?: string; points: PmcPoint[] }
  | { type: 'curve'; title?: string; unit?: string; invertY?: boolean; points: CurvePoint[]; compare?: CurvePoint[] }
) & { insight?: string }

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
        return slices.length ? { type: 'donut', insight: str(o.insight), title: str(o.title), unit: str(o.unit), centerLabel: str(o.centerLabel ?? o.center_label), centerValue: str(o.centerValue ?? o.center_value), slices } : null
      }
      case 'gauge': {
        if (!Number.isFinite(Number(o.value))) return null
        const bands = Array.isArray(o.bands) ? (o.bands as GaugeBand[]).filter(b => Number.isFinite(Number(b.upTo)) && typeof b.color === 'string') : undefined
        return { type: 'gauge', insight: str(o.insight), title: str(o.title), value: Number(o.value), min: num(o.min), max: num(o.max), unit: str(o.unit), color: str(o.color), bands, invert: !!o.invert, valueText: str(o.valueText ?? o.value_text) }
      }
      case 'radar': {
        const axes = Array.isArray(o.axes) ? (o.axes as unknown[]).map(String) : []
        const series = Array.isArray(o.series) ? (o.series as RadarSeries[]).map(s => ({ label: String(s?.label ?? ''), color: s?.color, values: numArr(s?.values, axes.length) ?? [] })).filter(s => s.values.length === axes.length) : []
        return axes.length >= 3 && series.length ? { type: 'radar', insight: str(o.insight), title: str(o.title), axes, max: num(o.max), series } : null
      }
      case 'zones': {
        const seconds = numArr(o.seconds, 5); if (!seconds) return null
        const target = numArr(o.target, 5) ?? undefined
        return { type: 'zones', insight: str(o.insight), title: str(o.title), seconds, target }
      }
      case 'pmc': {
        const pts = Array.isArray(o.points) ? (o.points as PmcPoint[]).filter(p => p && typeof p.date === 'string' && Number.isFinite(Number(p.ctl))).map(p => ({ date: p.date, tss: Number(p.tss ?? 0), ctl: Number(p.ctl), atl: Number(p.atl), tsb: Number(p.tsb ?? (Number(p.ctl) - Number(p.atl))) })) : []
        return pts.length >= 2 ? { type: 'pmc', insight: str(o.insight), title: str(o.title), points: pts } : null
      }
      case 'curve': {
        const pts = Array.isArray(o.points) ? (o.points as CurvePoint[]).filter(p => Number.isFinite(Number(p?.t)) && Number.isFinite(Number(p?.v))).map(p => ({ t: Number(p.t), v: Number(p.v) })) : []
        const cmp = Array.isArray(o.compare) ? (o.compare as CurvePoint[]).filter(p => Number.isFinite(Number(p?.t)) && Number.isFinite(Number(p?.v))).map(p => ({ t: Number(p.t), v: Number(p.v) })) : undefined
        return pts.length >= 2 ? { type: 'curve', insight: str(o.insight), title: str(o.title), unit: str(o.unit), invertY: !!o.invertY, points: pts, compare: cmp } : null
      }
    }
  } catch { return null }
  return null
}
function str(v: unknown): string | undefined { return typeof v === 'string' ? v : undefined }
function num(v: unknown): number | undefined { return Number.isFinite(Number(v)) ? Number(v) : undefined }

const AC_GRAD = 'linear-gradient(135deg,#06B6D4,#3B82F6)'
// Petite icône par type de graphe (badge d'en-tête).
function chartIcon(type: AdvSpec['type']): string {
  switch (type) {
    case 'donut': return 'M12 2a10 10 0 1 0 10 10M12 2v10l7 7'                       // camembert
    case 'gauge': return 'M4 15a8 8 0 0 1 16 0M12 15l4-4'                             // jauge
    case 'radar': return 'M12 2 3 8l3 11h12l3-11zM12 2v20M3 8l18 0'                   // radar
    case 'zones': return 'M4 20V10M9 20V4M14 20v-8M19 20V7'                            // barres
    case 'pmc':   return 'M3 17l5-6 4 3 5-8M3 21h18'                                   // courbe charge
    case 'curve': return 'M3 20c5 0 5-12 9-12s4 8 9 8'                                 // courbe
  }
}
export function AdvancedChartCard({ spec }: { spec: AdvSpec }) {
  const { t } = useI18n()
  return (
    <div className="ac-card" style={{ margin: '16px auto', maxWidth: 580, width: '100%', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--bg-card)', boxShadow: '0 10px 34px rgba(16,24,40,0.10)', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes acReveal{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes acFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ac-card{animation:acReveal .5s cubic-bezier(0.22,1,0.36,1) both}
        .ac-card .ac-chart{animation:acFade .55s cubic-bezier(0.22,1,0.36,1) .12s both}
        .ac-card .ac-insight{animation:acFade .5s ease-out .28s both}
        @media (prefers-reduced-motion: reduce){.ac-card,.ac-card .ac-chart,.ac-card .ac-insight{animation:none}}
      `}</style>
      <div style={{ height: 4, background: AC_GRAD }} />
      <div style={{ padding: 18 }}>
        {spec.title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 15px' }}>
            <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: AC_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(6,182,212,0.38)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={chartIcon(spec.type)} /></svg>
            </span>
            <p style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 15.5, fontWeight: 800, color: 'var(--text)', lineHeight: 1.15 }}>{spec.title}</p>
          </div>
        )}
        <div className="ac-chart"><AdvancedChart spec={spec} /></div>
      </div>
      {spec.insight && (
        <div className="ac-insight" style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, var(--primary) 6%, var(--bg-card2))', display: 'flex', gap: 10 }}>
          <span aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></svg>
          </span>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)' }}><strong style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('w4c.adv_analysis')}</strong>{spec.insight}</p>
        </div>
      )}
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
