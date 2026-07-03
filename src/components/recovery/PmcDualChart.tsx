'use client'

// ══════════════════════════════════════════════════════════════
// PmcDualChart — PMC double (SM métabolique / SN neuromusculaire).
// Consomme la série déjà calculée par useTrainingLoad (PmcDualPoint[]).
// AUCUN recalcul. SVG brut, couleurs via tokens + PMC_COLORS (convention).
// Deux panneaux : CTL + ATL + courbe TSB, ligne d'équilibre (zéro).
// ══════════════════════════════════════════════════════════════

import { useTrainingLoad } from '@/hooks/useTrainingLoad'
import { PMC_COLORS, type PmcDualPoint } from '@/lib/training/pmcDual'
import { useI18n } from '@/lib/i18n'

const W = 620, H = 132
const NUM = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: "'zero' 0" }

type Axis = { titleKey: string; accent: string; ctl: keyof PmcDualPoint; atl: keyof PmcDualPoint; tsb: keyof PmcDualPoint }
const AXES: Axis[] = [
  { titleKey: 'recovery.pmc.axis.metabolic',      accent: PMC_COLORS.sm, ctl: 'ctlSm', atl: 'atlSm', tsb: 'tsbSm' },
  { titleKey: 'recovery.pmc.axis.neuromuscular',  accent: PMC_COLORS.sn, ctl: 'ctlSn', atl: 'atlSn', tsb: 'tsbSn' },
]

function pathOf(pts: PmcDualPoint[], key: keyof PmcDualPoint, min: number, max: number): string {
  if (pts.length < 2) return ''
  const range = max - min || 1
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - ((Number(p[key]) - min) / range) * H
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function Panel({ pts, axis }: { pts: PmcDualPoint[]; axis: Axis }) {
  const { t } = useI18n()
  const vals = pts.flatMap(p => [Number(p[axis.ctl]), Number(p[axis.atl]), Number(p[axis.tsb])])
  const min = Math.min(...vals, -10), max = Math.max(...vals, 10)
  const range = max - min || 1
  const zero = H - ((0 - min) / range) * H
  const tsbPath = pathOf(pts, axis.tsb, min, max)

  const ticks: number[] = []
  const step = Math.max(1, Math.floor(pts.length / 5))
  for (let i = 0; i < pts.length; i += step) ticks.push(i)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: axis.accent, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{t(axis.titleKey)}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {[{ l: 'CTL', c: axis.accent }, { l: 'ATL', c: 'var(--rec-fatigue)' }, { l: 'TSB', c: 'var(--text-mid)' }].map(x => (
            <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span aria-hidden style={{ width: 12, height: 2, background: x.c, borderRadius: 1 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{x.l}</span>
            </span>
          ))}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <clipPath id={`pmc-up-${axis.ctl}`}><rect x={0} y={0} width={W} height={zero} /></clipPath>
        <clipPath id={`pmc-dn-${axis.ctl}`}><rect x={0} y={zero} width={W} height={H - zero} /></clipPath>
        <path d={`${tsbPath} L ${W} ${H} L 0 ${H} Z`} fill="var(--charge-low)" fillOpacity={0.10} clipPath={`url(#pmc-up-${axis.ctl})`} />
        <path d={`${tsbPath} L ${W} ${H} L 0 ${H} Z`} fill="var(--charge-hard)" fillOpacity={0.10} clipPath={`url(#pmc-dn-${axis.ctl})`} />
        <line x1={0} y1={zero} x2={W} y2={zero} stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1} />
        <path d={pathOf(pts, axis.ctl, min, max)} fill="none" stroke={axis.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathOf(pts, axis.atl, min, max)} fill="none" stroke="var(--rec-fatigue)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={tsbPath} fill="none" stroke="var(--text-mid)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {ticks.map(i => (
          <text key={i} x={(i / (pts.length - 1)) * W} y={H + 14} fill="var(--text-dim)" fontSize={9} textAnchor="middle">{pts[i]?.date.slice(5)}</text>
        ))}
      </svg>
    </div>
  )
}

export default function PmcDualChart() {
  const { t } = useI18n()
  const tl = useTrainingLoad()

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Performance Management Chart</h2>
      <p style={{ ...NUM, fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>
        {t('recovery.pmc.legend', { n: tl.series.length })}
      </p>

      {tl.loading ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>{t('recovery.pmc.loading')}</p>
      ) : tl.series.length < 2 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>
          {t('recovery.pmc.notEnough')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {AXES.map(a => <Panel key={a.titleKey} pts={tl.series} axis={a} />)}
        </div>
      )}
    </div>
  )
}
