'use client'
// Onglet Historique : frise toutes années (SVG brut, points par date sur 3 bandes
// de sévérité, taille = durée, tooltip natif), classements zones/sports, résolus.
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury } from '../types'
import { durationDays, isRecidive, zonesRanking, sportsRanking } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }
const ts = (d: string) => new Date(d).getTime()
const moYr = (t: number) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` }

// Frise des épisodes — vraie timeline : chaque blessure = une BARRE de sa durée
// réelle (début → résolution ou aujourd'hui), couleur = sévérité, une ligne par
// épisode, axe mensuel + marqueur « aujourd'hui ». On lit d'un coup durée,
// chevauchements et récidives. SVG brut, tokens de sévérité.
function monthStarts(min: number, max: number): number[] {
  const out: number[] = []
  const d = new Date(min); d.setDate(1); d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) { out.push(d.getTime()); d.setMonth(d.getMonth() + 1) }
  return out
}

function Frise({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  if (!injuries.length) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.friseEmpty')}</p>

  // Plus récent en haut. Barre = onset → (resolved ou aujourd'hui).
  const rows = [...injuries].sort((a, b) => ts(b.onset_date) - ts(a.onset_date))
  const now = Date.now()
  const ends = rows.map(i => (i.resolved_date ? ts(i.resolved_date) : now))
  const onsets = rows.map(i => ts(i.onset_date))
  let min = Math.min(...onsets), max = Math.max(...ends, now)
  const pad = Math.max((max - min) * 0.03, 2 * 86400000)
  min -= pad; max += pad
  const span = max - min || 1

  const W = 340, labelW = 96, padR = 12, padT = 8, rowH = 26, barH = 12
  const plotL = labelW, plotR = W - padR
  const H = padT + rows.length * rowH + 26
  const x = (tm: number) => plotL + ((tm - min) / span) * (plotR - plotL)
  const rowMid = (i: number) => padT + i * rowH + rowH / 2
  const months = monthStarts(min, max)
  const nowX = x(now)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grille mensuelle + libellés d'axe */}
      {months.map((m, k) => {
        const gx = x(m)
        if (gx < plotL - 1 || gx > plotR + 1) return null
        return (
          <g key={k}>
            <line x1={gx} y1={padT} x2={gx} y2={H - 20} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={gx} y={H - 6} fontFamily={FB} fontSize={8.5} fill="var(--text-dim)" textAnchor="middle">{moYr(m)}</text>
          </g>
        )
      })}
      {/* Marqueur aujourd'hui */}
      <line x1={nowX} y1={padT} x2={nowX} y2={H - 20} stroke="var(--primary)" strokeWidth={1} strokeDasharray="2 3" opacity={0.8} />

      {rows.map((i, idx) => {
        const c = SEV[i.severity].varc
        const my = rowMid(idx)
        const x1 = x(ts(i.onset_date))
        const x2 = Math.max(x1 + 6, x(i.resolved_date ? ts(i.resolved_date) : now))
        const active = i.status === 'active'
        return (
          <g key={i.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(i)}>
            {/* fond de ligne (hover cible) */}
            <rect x={0} y={my - rowH / 2 + 1} width={W} height={rowH - 2} rx={7} fill="var(--bg-card2)" opacity={0.5} />
            {/* libellé zone */}
            <text x={10} y={my + 3.5} fontFamily={FB} fontSize={11} fontWeight={600} fill="var(--text)" clipPath="url(#lblClip)">{i.zone}</text>
            {/* barre de durée */}
            <rect x={x1} y={my - barH / 2} width={x2 - x1} height={barH} rx={barH / 2} fill={c} opacity={active ? 1 : 0.5}>
              <title>{`${i.zone}${i.structure ? ' · ' + i.structure : ''} · ${SEV[i.severity].label} · ${durationDays(i)} ${t('injuries.dayUnit')}${i.activity ? ' · ' + i.activity : ''} · ${i.onset_date}${i.resolved_date ? ' → ' + i.resolved_date : ''}`}</title>
            </rect>
            {/* bout ouvert (encore actif) = point pulsant à droite */}
            {active && <circle cx={x2} cy={my} r={barH / 2 + 1.5} fill="none" stroke={c} strokeWidth={1.5} opacity={0.7} />}
          </g>
        )
      })}
      <defs><clipPath id="lblClip"><rect x={0} y={0} width={labelW - 8} height={H} /></clipPath></defs>
    </svg>
  )
}

function Ranking({ title, data, color }: { title: string; data: { key: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <p style={lbl}>{title}</p>
      {data.length === 0 ? <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>—</p> : data.slice(0, 5).map((d, i) => (
        <div key={d.key} style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontFamily: FB, fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--text)' : 'var(--text-mid)' }}>{d.key}</span>
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color }}>{d.count}</span>
          </div>
          <AnimatedBar pct={(d.count / max) * 100} color={color} height={7} />
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
        <Ranking title={t('injuries.rankZones')} data={zonesRanking(injuries)} color="var(--charge-hard)" />
        <Ranking title={t('injuries.rankSports')} data={sportsRanking(injuries)} color="var(--primary)" />
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
