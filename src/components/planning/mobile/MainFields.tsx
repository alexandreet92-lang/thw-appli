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
import { sportColor, zColor, fmtDur, parseDurInput } from './editorial'
import { Card, FieldLabel, Gauge } from './ui'

const SPORTS: SportType[] = ['run', 'bike', 'swim', 'hyrox', 'gym', 'rowing', 'elliptique']
const RPE_DESC = ['Très facile', 'Très facile', 'Facile', 'Facile', 'Modéré', 'Modéré', 'Soutenu', 'Difficile', 'Très difficile', 'Maximal']

export function MainFields(p: {
  sport: SportType; accent: string; onSportChange: (s: SportType) => void
  cyclingSub: CyclingSub; setCyclingSub: (s: CyclingSub) => void
  brickRun: boolean; setBrickRun: (b: boolean) => void
  trainingTypes: string[]; setTrainingTypes: (t: string[]) => void
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void
  dur: number; setDur: (n: number) => void
  rpe: number; setRpe: (n: number) => void
  desc: string; setDesc: (v: string) => void
  athlete: { ftp: number | null; lthrBike: number | null; lthrRun: number | null; runThresholdPaceStr: string | null; swimCSSStr: string | null; hrMax: number | null } | null
}) {
  const trainTypes = TRAINING_TYPES[p.sport] ?? []
  const rpeIdx = Math.max(0, Math.min(9, Math.round(p.rpe) - 1))
  const rpeCol = p.rpe <= 4 ? zColor(2) : p.rpe <= 6 ? zColor(4) : p.rpe <= 8 ? zColor(5) : zColor(6)

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

      {/* Brick Run : enchaînement vélo → course à pied (crée une course liée) */}
      {p.sport === 'bike' && (
        <button type="button" onClick={() => p.setBrickRun(!p.brickRun)} title="Enchaînement vélo → course à pied"
          style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            border: `1px solid ${p.brickRun ? sportColor('run') : 'var(--se-rule)'}`,
            background: p.brickRun ? `${sportColor('run')}1f` : 'var(--se-card)',
            color: p.brickRun ? sportColor('run') : 'var(--se-dim)', display: 'flex', alignItems: 'center', gap: 7 }}>
          {p.brickRun ? '✓' : '+'} Brick Run
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>vélo → course</span>
        </button>
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
        <div style={{ marginTop: 12 }}>
          <Gauge value={p.rpe} min={0.5} max={10} step={0.5} onChange={p.setRpe} color={rpeCol}
            gradient={`linear-gradient(90deg, ${zColor(2)}, ${zColor(4)}, ${zColor(6)})`} />
        </div>
      </Card>

      {/* Durée — jauge (pas 5min, jusqu'à 10h) + saisie manuelle */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>Durée</p>
          <span className="se-fr se-tnum" style={{ fontSize: 26, fontWeight: 600 }}>{fmtDur(p.dur)}</span>
          <input defaultValue={fmtDur(p.dur)} key={p.dur} placeholder="2h00"
            onBlur={e => { const v = parseDurInput(e.target.value); if (v != null) p.setDur(Math.max(5, Math.min(600, v))) }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{ width: 60, textAlign: 'center', background: 'var(--se-card2)', border: '1px solid var(--se-rule)', borderRadius: 8, padding: '5px 4px', fontSize: 12, color: 'var(--se-text)', outline: 'none' }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Gauge value={p.dur} min={5} max={600} step={5} onChange={n => p.setDur(n)} color={p.accent} />
        </div>
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
