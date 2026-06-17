'use client'
// ══════════════════════════════════════════════════════════════════
// Écran principal mobile (§3/§4) : sélecteur de sport, sous-discipline,
// type de séance, date/heure, effort perçu, durée, SM/SN, mini-stats,
// description. Rendu uniquement — setters fournis par le parent.
// ══════════════════════════════════════════════════════════════════
import { SportIcon } from '@/components/icons/SportIcon'
import {
  type SportType, type CyclingSub,
  SPORT_SHORT, CYCLING_SUB_LABEL, TRAINING_TYPES,
} from '@/app/planning/page'
import { sportColor, zColor, zName, fmtDur } from './editorial'
import { toBars, type MBlock } from './blocks'
import { Card, FieldLabel } from './ui'

const SPORTS: SportType[] = ['run', 'bike', 'swim', 'hyrox', 'gym', 'rowing', 'elliptique']
const RPE_DESC = ['Très facile', 'Très facile', 'Facile', 'Facile', 'Modéré', 'Modéré', 'Soutenu', 'Difficile', 'Très difficile', 'Maximal']

export function MainFields(p: {
  sport: SportType; accent: string; onSportChange: (s: SportType) => void
  cyclingSub: CyclingSub; setCyclingSub: (s: CyclingSub) => void
  trainingTypes: string[]; setTrainingTypes: (t: string[]) => void
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void
  dur: number; setDur: (n: number) => void
  rpe: number; setRpe: (n: number) => void
  desc: string; setDesc: (v: string) => void
  blocks: MBlock[]; sm: number; sn: number
  athlete: { ftp: number | null; lthrBike: number | null; lthrRun: number | null; runThresholdPaceStr: string | null; swimCSSStr: string | null; hrMax: number | null } | null
}) {
  const trainTypes = TRAINING_TYPES[p.sport] ?? []
  const rpeIdx = Math.max(0, Math.min(9, p.rpe - 1))
  const rpeCol = p.rpe <= 4 ? zColor(2) : p.rpe <= 6 ? zColor(4) : p.rpe <= 8 ? zColor(5) : zColor(6)

  // Distribution par zone (barre SM/SN)
  const zd = new Array(7).fill(0)
  for (const b of toBars(p.blocks)) zd[Math.max(0, Math.min(6, b.zone - 1))] += b.min
  const zTot = zd.reduce((a: number, x: number) => a + x, 0)

  // Mini-stats par sport (réfs manquantes masquées)
  const stats: { label: string; value: string }[] = []
  const a = p.athlete
  if (a) {
    if (p.sport === 'bike') { if (a.ftp) stats.push({ label: 'FTP', value: `${a.ftp} W` }); if (a.lthrBike) stats.push({ label: 'LTHR', value: `${a.lthrBike}` }) }
    else if (p.sport === 'run') { if (a.runThresholdPaceStr) stats.push({ label: 'Seuil', value: `${a.runThresholdPaceStr}/km` }); if (a.lthrRun) stats.push({ label: 'LTHR', value: `${a.lthrRun}` }) }
    else if (p.sport === 'swim') { if (a.swimCSSStr) stats.push({ label: 'CSS', value: `${a.swimCSSStr}/100m` }) }
    if (a.hrMax) stats.push({ label: 'FC max', value: `${a.hrMax}` })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* §3 — Sélecteur de sport */}
      <div>
        <h3 className="se-fr" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>Sport</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {SPORTS.map(s => {
            const on = s === p.sport
            return (
              <button key={s} type="button" onClick={() => p.onSportChange(s)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 0, flex: 1 }}>
                <span style={{ opacity: on ? 1 : 0.4, display: 'flex' }}><SportIcon sport={s} size={23} circle={false} /></span>
                <span style={{ fontSize: 9, fontWeight: on ? 700 : 500, color: on ? sportColor(s) : 'var(--se-dim)' }}>{SPORT_SHORT[s]}</span>
                <span style={{ width: 16, height: 2, borderRadius: 2, background: on ? sportColor(s) : 'transparent' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Sous-discipline (vélo) */}
      {p.sport === 'bike' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(CYCLING_SUB_LABEL) as CyclingSub[]).map(k => {
            const on = k === p.cyclingSub
            return <button key={k} type="button" onClick={() => p.setCyclingSub(k)} style={{ flex: 1, padding: '11px 8px', borderRadius: 'var(--se-r-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? p.accent : 'var(--se-rule)'}`, background: 'var(--se-card)', color: on ? p.accent : 'var(--se-dim)' }}>{CYCLING_SUB_LABEL[k]}</button>
          })}
        </div>
      )}

      {/* Type de séance */}
      {trainTypes.length > 0 && (
        <div>
          <h3 className="se-fr" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>Type de séance</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trainTypes.map(t => {
              const on = p.trainingTypes.includes(t)
              return <button key={t} type="button" onClick={() => p.setTrainingTypes(on ? p.trainingTypes.filter(x => x !== t) : [...p.trainingTypes, t])} style={{ padding: '8px 18px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? p.accent : 'var(--se-rule)'}`, background: on ? p.accent : 'var(--se-card)', color: on ? '#fff' : 'var(--se-dim)' }}>{t}</button>
            })}
          </div>
        </div>
      )}

      {/* Date / Heure */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Card style={{ padding: '12px 16px' }}>
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={p.date} onChange={e => p.setDate(e.target.value)} className="se-fr" style={inp} />
        </Card>
        <Card style={{ padding: '12px 16px' }}>
          <FieldLabel>Heure</FieldLabel>
          <input type="time" value={p.time} onChange={e => p.setTime(e.target.value)} className="se-fr" style={inp} />
        </Card>
      </div>

      {/* Effort perçu */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>Effort perçu</p>
            <p className="se-fr" style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 600, color: rpeCol }}>{RPE_DESC[rpeIdx]}</p>
          </div>
          <p className="se-fr se-tnum" style={{ margin: 0, fontSize: 34, fontWeight: 600, color: rpeCol, lineHeight: 1 }}>{p.rpe}<span style={{ fontSize: 13, color: 'var(--se-dim)' }}>/10</span></p>
        </div>
        <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const v = Math.round(((e.clientX - r.left) / r.width) * 10); p.setRpe(Math.max(1, Math.min(10, v))) }}
          style={{ marginTop: 14, height: 8, borderRadius: 5, cursor: 'pointer', position: 'relative', background: `linear-gradient(90deg, ${zColor(2)}, ${zColor(4)}, ${zColor(6)})` }}>
          <span style={{ position: 'absolute', top: '50%', left: `${(p.rpe / 10) * 100}%`, width: 16, height: 16, borderRadius: '50%', background: 'var(--se-card)', border: `2px solid ${rpeCol}`, transform: 'translate(-50%,-50%)' }} />
        </div>
      </Card>

      {/* Durée */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>Durée</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button type="button" onClick={() => p.setDur(Math.max(5, p.dur - 5))} style={stepBtn}>−</button>
            <span className="se-fr se-tnum" style={{ fontSize: 26, fontWeight: 600, minWidth: 64, textAlign: 'center' }}>{fmtDur(p.dur)}</span>
            <button type="button" onClick={() => p.setDur(p.dur + 5)} style={stepBtn}>+</button>
          </div>
        </div>
      </Card>

      {/* SM / SN */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div><p style={lblS}>SM métabolique</p><p className="se-fr se-tnum" style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 600, color: '#22b8c4', lineHeight: 1 }}>{p.sm}</p></div>
          <div style={{ textAlign: 'right' }}><p style={lblS}>SN neuro</p><p className="se-fr se-tnum" style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 600, color: '#a855f7', lineHeight: 1 }}>{p.sn}</p></div>
        </div>
        {zTot > 0 && (
          <>
            <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', marginTop: 14 }}>
              {zd.map((v: number, i: number) => v > 0 ? <span key={i} style={{ width: `${(v / zTot) * 100}%`, background: zColor(i + 1) }} /> : null)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
              {zd.map((v: number, i: number) => v > 0 ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--se-dim)' }}><span style={{ width: 7, height: 7, borderRadius: 2, background: zColor(i + 1) }} />{zName(i + 1)}</span> : null)}
            </div>
          </>
        )}
      </Card>

      {/* Mini-stats */}
      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.map(s => (
            <div key={s.label} style={{ flex: 1, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r-sm)', padding: '9px 10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--se-dim)' }}>{s.label}</p>
              <p className="se-fr se-tnum" style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 600 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea value={p.desc} onChange={e => p.setDesc(e.target.value)} rows={3} placeholder="Notes, consignes…"
          style={{ width: '100%', resize: 'vertical', background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', padding: 12, fontSize: 13, color: 'var(--se-text)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 17, fontWeight: 600, padding: 0 }
const stepBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const lblS: React.CSSProperties = { margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }
