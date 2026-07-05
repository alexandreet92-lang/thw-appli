'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { SWIM_STROKE_KEY } from './SwimmingStrokeSelector'

export interface SwimInterval {
  id: string
  distanceM: number
  durationSec: number
  stroke: string
  restSec: number
}

const STROKES = [
  { id: '',             label: 'Non précisé' },
  { id: 'freestyle',    label: 'Crawl' },
  { id: 'backstroke',   label: 'Dos' },
  { id: 'breaststroke', label: 'Brasse' },
  { id: 'butterfly',    label: 'Papillon' },
  { id: 'mixed',        label: 'Mixte' },
]

function pace100m(distM: number, durSec: number): string {
  if (distM <= 0 || durSec <= 0) return '--'
  const sec = (durSec / distM) * 100
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')} /100m`
}

function fmtTotal(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function parseMmss(val: string): number {
  const [mm, ss] = val.split(':')
  return (parseInt(mm) || 0) * 60 + (parseInt(ss) || 0)
}

interface Props {
  intervals: SwimInterval[]
  onChange: (v: SwimInterval[]) => void
  poolSizeM: number
  isDark: boolean
}

const numStyle = {
  width: 72, padding: '8px 10px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border)', background: 'var(--bg-card2)',
  color: 'var(--text)', outline: 'none', fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box' as const,
}

export default function SwimmingIntervals({ intervals, onChange, poolSizeM, isDark }: Props) {
  const { t } = useI18n()
  const [durStrs, setDurStrs] = useState<Record<string, string>>({})

  const update = (id: string, patch: Partial<SwimInterval>) =>
    onChange(intervals.map(i => i.id === id ? { ...i, ...patch } : i))

  const add = () => onChange([...intervals, {
    id: crypto.randomUUID(),
    distanceM: poolSizeM > 0 ? poolSizeM * 4 : 400,
    durationSec: 0, stroke: '', restSec: 0,
  }])

  const remove = (id: string) => {
    onChange(intervals.filter(i => i.id !== id))
    setDurStrs(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const getDurStr = (iv: SwimInterval) =>
    iv.id in durStrs ? durStrs[iv.id]
    : iv.durationSec === 0 ? ''
    : `${Math.floor(iv.durationSec / 60)}:${String(iv.durationSec % 60).padStart(2, '0')}`

  const commitDur = (id: string, val: string) => {
    update(id, { durationSec: parseMmss(val) })
    setDurStrs(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const totalDist = intervals.reduce((s, i) => s + i.distanceM, 0)
  const totalDur  = intervals.reduce((s, i) => s + i.durationSec, 0)
  const stepDist  = poolSizeM > 0 ? 25 : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {intervals.map((iv, idx) => (
        <div key={iv.id} style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: '14px', border: `1px solid ${sep}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#06B6D4' }}>{t('record.swimSet', { n: idx + 1 })}</span>
            <button onClick={() => remove(iv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dim, fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{t('record.swimIntervalDistance')}</span>
              <input
                type="number" value={iv.distanceM || ''} min={0} step={stepDist} placeholder="0"
                onChange={e => update(iv.id, { distanceM: parseInt(e.target.value) || 0 })}
                style={numStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{t('record.swimIntervalDuration')}</span>
              <input
                type="text" value={getDurStr(iv)} placeholder="0:00"
                onChange={e => setDurStrs(prev => ({ ...prev, [iv.id]: e.target.value }))}
                onBlur={e => commitDur(iv.id, e.target.value)}
                style={{ ...numStyle, width: 72 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{t('record.swimIntervalStroke')}</span>
              <select
                value={iv.stroke}
                onChange={e => update(iv.id, { stroke: e.target.value })}
                style={{ ...numStyle, width: 110, cursor: 'pointer' }}
              >
                {STROKES.map(s => <option key={s.id} value={s.id}>{SWIM_STROKE_KEY[s.id] ? t(SWIM_STROKE_KEY[s.id]) : s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{t('record.swimIntervalRest')}</span>
              <input
                type="number" value={iv.restSec || ''} min={0} step={15} placeholder="0"
                onChange={e => update(iv.id, { restSec: parseInt(e.target.value) || 0 })}
                style={{ ...numStyle, width: 60 }}
              />
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>
            {pace100m(iv.distanceM, iv.durationSec)}
          </p>
        </div>
      ))}

      <button
        onClick={add}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.20)' : '#D1D5DB'}`,
          background: 'none', color: '#06B6D4', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {t('record.swimAddInterval')}
      </button>

      {intervals.length > 0 && (
        <p style={{ margin: 0, fontSize: 13, color: dim, textAlign: 'right' as const }}>
          {t('record.swimIntervalsTotal')} <strong style={{ color: 'var(--text)' }}>{totalDist}m · {fmtTotal(totalDur)}</strong>
        </p>
      )}
    </div>
  )
}
