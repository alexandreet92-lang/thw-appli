'use client'
// Feuille « Suivi » : stepper de phases, courbe de douleur (repos vs effort depuis
// les logs), impact, rééducation (exos cochables), journal, actions. Tokens uniquement.
import { useState } from 'react'
import { Sheet, primaryBtn } from './Sheet'
import { PHASES, type Injury, type InjuryLog } from '../types'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const sec: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }

function Curve({ logs }: { logs: InjuryLog[] }) {
  const { t } = useI18n()
  const pts = logs.filter(l => l.intensity_rest != null || l.intensity_effort != null)
  if (pts.length < 2) return <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{t('injuries.curveNotEnough')}</p>
  const W = 300, H = 90, p = 8, n = pts.length
  const x = (i: number) => p + (i / (n - 1)) * (W - 2 * p)
  const y = (v: number) => H - p - (v / 10) * (H - 2 * p)
  const path = (key: 'intensity_rest' | 'intensity_effort') => pts.map((l, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(l[key] ?? 0).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <path d={path('intensity_rest')} fill="none" stroke="var(--text-mid)" strokeWidth={2} strokeLinejoin="round" />
      <path d={path('intensity_effort')} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

export function TrackSheet({ injury, logs, onClose, onUpdate, onAddLog, onResolve }: {
  injury: Injury; logs: InjuryLog[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Injury>) => void
  onAddLog: (log: Omit<InjuryLog, 'id'>) => void
  onResolve: (id: string) => void
}) {
  const { t } = useI18n()
  const [note, setNote] = useState('')
  const mine = logs.filter(l => l.injury_id === injury.id)
  const curIdx = PHASES.findIndex(p => p.id === injury.phase)
  const toggleExo = (idx: number) => onUpdate(injury.id, { rehab: injury.rehab.map((x, i) => i === idx ? { ...x, done: !x.done } : x) })

  return (
    <Sheet title={injury.zone} onClose={onClose}
      footer={<button onClick={() => { onResolve(injury.id); onClose() }} style={{ ...primaryBtn, background: 'var(--bg-card2)', color: 'var(--text)' }}>{t('injuries.markResolved')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <p style={sec}>{t('injuries.phaseLabel')}</p>
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {PHASES.map((p, i) => (
              <button key={p.id} onClick={() => onUpdate(injury.id, { phase: p.id })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--r-sm)', fontFamily: FB, fontSize: 12, fontWeight: i === curIdx ? 600 : 500, color: i === curIdx ? 'var(--text)' : 'var(--text-dim)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: i <= curIdx ? 'var(--primary)' : 'var(--border)' }} />{p.label}
              </button>
            ))}
          </div>
        </div>

        <div><p style={sec}>{t('injuries.painCurve')}</p><Curve logs={mine} /></div>

        {(injury.impact.avoid.length > 0 || injury.impact.ok.length > 0) && (
          <div>
            <p style={sec}>{t('injuries.impactTitle')}</p>
            {injury.impact.avoid.length > 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.availAvoid', { list: injury.impact.avoid.join(', ') })}</p>}
            {injury.impact.ok.length > 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{t('injuries.impactOk', { list: injury.impact.ok.join(', ') })}</p>}
          </div>
        )}

        {injury.rehab.length > 0 && (
          <div>
            <p style={sec}>{t('injuries.rehabTitle')}</p>
            {injury.rehab.map((x, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-1) 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={x.done} onChange={() => toggleExo(i)} style={{ accentColor: 'var(--primary)' }} />
                <span style={{ fontFamily: FB, fontSize: 13, color: x.done ? 'var(--text-dim)' : 'var(--text)' }}>{x.nom}{x.detail ? ` — ${x.detail}` : ''}</span>
              </label>
            ))}
          </div>
        )}

        {(injury.practitioner || injury.next_appointment) && (
          <div>
            <p style={sec}>{t('injuries.medicalTitle')}</p>
            {injury.practitioner && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.practitioner', { name: injury.practitioner })}</p>}
            {injury.next_appointment && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{t('injuries.nextAppointment', { date: injury.next_appointment })}</p>}
          </div>
        )}

        <div>
          <p style={sec}>{t('injuries.journalTitle')}</p>
          {mine.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '0 0 var(--space-2)' }}>{t('injuries.journalEmpty')}</p>}
          {mine.slice().reverse().map(l => (
            <div key={l.id} style={{ padding: 'var(--space-1) 0' }}>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{l.log_date}</span>
              <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', marginLeft: 'var(--space-2)' }}>{l.note ?? t('injuries.logFallback', { rest: l.intensity_rest ?? '—', effort: l.intensity_effort ?? '—' })}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('injuries.addNotePlaceholder')} style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none' }} />
            <button onClick={() => { if (note.trim()) { onAddLog({ injury_id: injury.id, log_date: new Date().toISOString().slice(0, 10), note: note.trim(), intensity_rest: null, intensity_effort: null }); setNote('') } }} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('injuries.addBtn')}</button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
