'use client'
// Onglet Historique : frise toutes années (SVG brut, points par date sur 3 bandes
// de sévérité, taille = durée, tooltip natif), classements zones/sports, résolus.
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury, type Severity } from '../types'
import { durationDays, isRecidive, zonesRanking, sportsRanking } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }
const ts = (d: string) => new Date(d).getTime()
const moYr = (t: number) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` }

// Frise des épisodes — lanes de sévérité, pastilles auréolées (taille = durée),
// axe temporel daté. SVG brut (aucune lib), couleurs = tokens de sévérité.
function Frise({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const LANES: { sev: Severity; label: string }[] = [
    { sev: 'blessure', label: t('injuries.sevBlessure') }, { sev: 'douleur', label: t('injuries.sevDouleur') }, { sev: 'gene', label: t('injuries.sevGene') },
  ]
  if (!injuries.length) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.friseEmpty')}</p>
  const W = 340, padT = 14, padB = 30, laneH = 48, laneGap = 10, plotL = 92, padR = 16
  const H = padT + LANES.length * laneH + (LANES.length - 1) * laneGap + padB
  const times = injuries.map(i => ts(i.onset_date))
  const min = Math.min(...times), max = Math.max(...times)
  const single = max === min
  const span = single ? 1 : max - min
  const x = (t: number) => single ? plotL + (W - plotL - padR) / 2 : plotL + ((t - min) / span) * (W - plotL - padR)
  const laneY = (i: number) => padT + i * (laneH + laneGap)
  const laneMid = (i: number) => laneY(i) + laneH / 2
  const axisY = H - padB + 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {LANES.map((b, idx) => {
        const c = SEV[b.sev].varc
        const my = laneMid(idx)
        return (
          <g key={b.sev}>
            <rect x={0} y={laneY(idx)} width={W} height={laneH} rx={14} fill="var(--bg-card2)" />
            {/* chip libellé coloré */}
            <rect x={10} y={my - 12} width={70} height={24} rx={12} fill={c} opacity={0.15} />
            <circle cx={24} cy={my} r={3.5} fill={c} />
            <text x={34} y={my + 3.5} fontFamily={FB} fontSize={11} fontWeight={600} fill={c}>{b.label}</text>
            {/* guide temporel */}
            <line x1={plotL} y1={my} x2={W - padR} y2={my} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 5" opacity={0.7} />
          </g>
        )
      })}
      {injuries.map(i => {
        const idx = LANES.findIndex(b => b.sev === i.severity)
        if (idx < 0) return null
        const c = SEV[i.severity].varc
        const r = Math.max(5, Math.min(13, durationDays(i) / 12 + 5))
        const cx = x(ts(i.onset_date)), cy = laneMid(idx)
        return (
          <g key={i.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(i)}>
            <circle cx={cx} cy={cy} r={r + 4} fill={c} opacity={0.16} />
            <circle cx={cx} cy={cy} r={r} fill={c} stroke="var(--bg-card)" strokeWidth={1.5}>
              <title>{`${i.zone}${i.structure ? ' · ' + i.structure : ''} · ${SEV[i.severity].label} · ${durationDays(i)} ${t('injuries.dayUnit')}${i.activity ? ' · ' + i.activity : ''} · ${i.onset_date}`}</title>
            </circle>
          </g>
        )
      })}
      {/* axe temporel */}
      <line x1={plotL} y1={axisY} x2={W - padR} y2={axisY} stroke="var(--border)" strokeWidth={1} />
      <text x={plotL} y={axisY + 14} fontFamily={FB} fontSize={9} fill="var(--text-dim)" textAnchor="start">{moYr(min)}</text>
      {!single && <text x={W - padR} y={axisY + 14} fontFamily={FB} fontSize={9} fill="var(--text-dim)" textAnchor="end">{moYr(max)}</text>}
    </svg>
  )
}

function Ranking({ title, data }: { title: string; data: { key: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <p style={lbl}>{title}</p>
      {data.length === 0 ? <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>—</p> : data.slice(0, 5).map(d => (
        <div key={d.key} style={{ marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{d.key}</span>
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{d.count}</span>
          </div>
          <AnimatedBar pct={(d.count / max) * 100} color="var(--text-mid)" height={5} />
        </div>
      ))}
    </div>
  )
}

export function HistoryTab({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const resolved = injuries.filter(i => i.status === 'resolved')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <p style={lbl}>{t('injuries.friseTitle')}</p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--space-4)' }}>
          <Frise injuries={injuries} onOpen={onOpen} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
        <Ranking title={t('injuries.rankZones')} data={zonesRanking(injuries)} />
        <Ranking title={t('injuries.rankSports')} data={sportsRanking(injuries)} />
      </div>
      <div>
        <p style={lbl}>{t('injuries.resolvedTitle')}</p>
        {resolved.length === 0 ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.resolvedEmpty')}</p> : resolved.map(i => (
          <div key={i.id} onClick={() => onOpen(i)} className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[i.severity].varc, flexShrink: 0 }} />
            <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', flex: 1 }}>{i.zone}</span>
            {isRecidive(i, injuries) && <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: 'var(--text-dim)' }}>{t('injuries.recidiveTag')}</span>}
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{durationDays(i)} {t('injuries.dayUnit')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
