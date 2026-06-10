'use client'
// Onglet Historique : frise toutes années (SVG brut, points par date sur 3 bandes
// de sévérité, taille = durée, tooltip natif), classements zones/sports, résolus.
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury, type Severity } from '../types'
import { durationDays, isRecidive, zonesRanking, sportsRanking } from '../lib'

const FB = 'var(--font-body)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }
const BANDS: { sev: Severity; y: number; label: string }[] = [
  { sev: 'blessure', y: 24, label: 'Blessure' }, { sev: 'douleur', y: 56, label: 'Douleur' }, { sev: 'gene', y: 88, label: 'Gêne' },
]
const ts = (d: string) => new Date(d).getTime()

function Frise({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  if (!injuries.length) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Aucun épisode enregistré.</p>
  const W = 320, H = 112, padL = 56, padR = 8
  const times = injuries.map(i => ts(i.onset_date))
  const min = Math.min(...times), max = Math.max(...times, min + 1)
  const x = (t: number) => padL + ((t - min) / (max - min)) * (W - padL - padR)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {BANDS.map(b => (
        <g key={b.sev}>
          <line x1={padL} y1={b.y} x2={W - padR} y2={b.y} stroke="var(--border)" strokeWidth={1} />
          <text x={4} y={b.y + 3} fontFamily={FB} fontSize={9} fill="var(--text-dim)">{b.label}</text>
        </g>
      ))}
      {injuries.map(i => {
        const band = BANDS.find(b => b.sev === i.severity)!
        const r = Math.max(3, Math.min(9, durationDays(i) / 14 + 3))
        return (
          <circle key={i.id} cx={x(ts(i.onset_date))} cy={band.y} r={r} fill={SEV[i.severity].varc} opacity={0.85}
            style={{ cursor: 'pointer' }} onClick={() => onOpen(i)}>
            <title>{`${i.zone}${i.structure ? ' · ' + i.structure : ''} · ${SEV[i.severity].label} · ${durationDays(i)} j${i.activity ? ' · ' + i.activity : ''} · ${i.onset_date}`}</title>
          </circle>
        )
      })}
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
  const resolved = injuries.filter(i => i.status === 'resolved')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div><p style={lbl}>Frise des épisodes</p><Frise injuries={injuries} onOpen={onOpen} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
        <Ranking title="Zones les plus touchées" data={zonesRanking(injuries)} />
        <Ranking title="Sports les plus à risque" data={sportsRanking(injuries)} />
      </div>
      <div>
        <p style={lbl}>Épisodes résolus</p>
        {resolved.length === 0 ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Aucun épisode résolu.</p> : resolved.map(i => (
          <div key={i.id} onClick={() => onOpen(i)} className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[i.severity].varc, flexShrink: 0 }} />
            <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', flex: 1 }}>{i.zone}</span>
            {isRecidive(i, injuries) && <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: 'var(--text-dim)' }}>récidive</span>}
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{durationDays(i)} j</span>
          </div>
        ))}
      </div>
    </div>
  )
}
