'use client'
// Onglet Historique — refonte : frise Gantt en HTML/CSS À TAILLE FIXE (barres
// fines, libellés petits, axe mensuel discret, marqueur « aujourd'hui »), qui NE
// scale PLUS avec la largeur (l'ancien SVG viewBox=340 étirait tout ×3 sur
// desktop). Classements en barres propres, résolus en cartes compactes.
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury } from '../types'
import { durationDays, isRecidive, zonesRanking, sportsRanking } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }
const DAY = 86400000
const ts = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : '')).getTime()
const moYr = (t: number) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` }

function monthStarts(min: number, max: number): number[] {
  const out: number[] = []
  const d = new Date(min); d.setDate(1); d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) { out.push(d.getTime()); d.setMonth(d.getMonth() + 1) }
  return out
}

// Frise Gantt : chaque épisode = une barre de sa durée réelle (début → résolution
// ou aujourd'hui), couleur = sévérité. Tailles FIXES (px), aucun scaling.
const LABEL_W = 96, ROW_H = 34, BAR_H = 10, AXIS_H = 18

function Frise({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  if (!injuries.length) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.friseEmpty')}</p>

  const rows = [...injuries].sort((a, b) => ts(b.onset_date) - ts(a.onset_date))
  const now = Date.now()
  const onsets = rows.map(i => ts(i.onset_date))
  const ends = rows.map(i => (i.resolved_date ? ts(i.resolved_date) : now))
  let min = Math.min(...onsets), max = Math.max(...ends, now)
  const pad = Math.max((max - min) * 0.04, 3 * DAY); min -= pad; max += pad
  const span = max - min || 1
  const pct = (tm: number) => ((tm - min) / span) * 100
  const months = monthStarts(min, max)

  return (
    <div style={{ position: 'relative' }}>
      {/* Lignes mensuelles + « aujourd'hui » — alignées sur la zone des barres */}
      <div style={{ position: 'absolute', left: LABEL_W, right: 0, top: 0, bottom: AXIS_H, pointerEvents: 'none' }}>
        {months.map((m, k) => {
          const p = pct(m)
          if (p < 0 || p > 100) return null
          return <div key={k} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)', opacity: 0.45 }} />
        })}
        <div style={{ position: 'absolute', left: `${pct(now)}%`, top: 0, bottom: 0, borderLeft: '1px dashed var(--primary)', opacity: 0.75 }} />
      </div>

      {/* Lignes (une par épisode) */}
      {rows.map(i => {
        const c = SEV[i.severity].varc
        const x1 = Math.max(0, pct(ts(i.onset_date)))
        const x2 = Math.min(100, pct(i.resolved_date ? ts(i.resolved_date) : now))
        const w = Math.max(x2 - x1, 1.5)
        const active = i.status === 'active'
        const tip = `${i.zone}${i.structure ? ' · ' + i.structure : ''} · ${SEV[i.severity].label} · ${durationDays(i)} ${t('injuries.dayUnit')}${i.activity ? ' · ' + i.activity : ''} · ${i.onset_date}${i.resolved_date ? ' → ' + i.resolved_date : ' → ' + t('injuries.today')}`
        return (
          <div key={i.id} onClick={() => onOpen(i)} className="card-interactive"
            style={{ display: 'flex', alignItems: 'center', height: ROW_H, cursor: 'pointer', borderRadius: 'var(--r-sm)' }}>
            <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, paddingRight: 8, boxSizing: 'border-box' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
              <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.zone}</span>
            </div>
            <div style={{ position: 'relative', flex: 1, height: '100%' }}>
              <div title={tip} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${x1}%`, width: `${w}%`, minWidth: 14, height: BAR_H, borderRadius: 999, background: c, opacity: active ? 1 : 0.5 }} />
              {active && <div style={{ position: 'absolute', top: '50%', left: `${x2}%`, transform: 'translate(-50%,-50%)', width: BAR_H + 6, height: BAR_H + 6, borderRadius: '50%', border: `1.5px solid ${c}`, opacity: 0.6, pointerEvents: 'none' }} />}
            </div>
          </div>
        )
      })}

      {/* Axe des mois */}
      <div style={{ position: 'relative', height: AXIS_H, marginLeft: LABEL_W }}>
        {months.map((m, k) => {
          const p = pct(m)
          if (p < 0 || p > 100) return null
          return <span key={k} style={{ position: 'absolute', left: `${p}%`, transform: 'translateX(-50%)', top: 4, fontFamily: FB, fontSize: 9.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{moYr(m)}</span>
        })}
      </div>
    </div>
  )
}

function Ranking({ title, data, color }: { title: string; data: { key: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <p style={lbl}>{title}</p>
      {data.length === 0 ? <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>—</p> : data.slice(0, 5).map((d, i) => (
        <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <span className="tnum" style={{ width: 16, flexShrink: 0, fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textAlign: 'right' }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, gap: 8 }}>
              <span style={{ fontFamily: FB, fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.key}</span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', flexShrink: 0 }}>{d.count}</span>
            </div>
            <AnimatedBar pct={(d.count / max) * 100} color={color} height={6} />
          </div>
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
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', maxWidth: 640 }}>
          <Frise injuries={injuries} onOpen={onOpen} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)', maxWidth: 640 }}>
        <Ranking title={t('injuries.rankZones')} data={zonesRanking(injuries)} color="var(--charge-hard)" />
        <Ranking title={t('injuries.rankSports')} data={sportsRanking(injuries)} color="var(--primary)" />
      </div>
      <div>
        <p style={lbl}>{t('injuries.resolvedTitle')}</p>
        {resolved.length === 0 ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.resolvedEmpty')}</p> : (
          <div style={{ maxWidth: 640 }}>
            {resolved.map(i => (
              <div key={i.id} onClick={() => onOpen(i)} className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[i.severity].varc, flexShrink: 0, opacity: 0.55 }} />
                <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.zone}</span>
                {isRecidive(i, injuries) && <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: 'var(--text-dim)' }}>{t('injuries.recidiveTag')}</span>}
                <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{durationDays(i)} {t('injuries.dayUnit')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
