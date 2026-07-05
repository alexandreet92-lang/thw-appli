'use client'
import { useI18n } from '@/lib/i18n'

export interface MatchSet { me: number; opp: number }

interface Props {
  sets: MatchSet[]
  onChange: (sets: MatchSet[]) => void
  isDark: boolean
}

export default function MatchScoreInput({ sets, onChange, isDark }: Props) {
  const { t } = useI18n()
  const text  = isDark ? '#FFF' : '#0A0A0A'
  const dim   = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const surf  = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const bord  = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  const numStyle = { width: 56, background: surf, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 8px', fontSize: 18, fontWeight: 700, color: text, outline: 'none', textAlign: 'center' as const, fontFamily: 'DM Sans, sans-serif' }

  const setsWonMe  = sets.filter(s => s.me  > s.opp).length
  const setsWonOpp = sets.filter(s => s.opp > s.me ).length

  const update = (i: number, field: 'me' | 'opp', val: number) => {
    const arr = [...sets]
    arr[i] = { ...arr[i], [field]: Math.max(0, Math.min(99, val)) }
    onChange(arr)
  }

  return (
    <div>
      {sets.map((set, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: dim, width: 44, flexShrink: 0 }}>{t('record.matchScoreSet', { n: i + 1 })}</span>
          <input type="number" value={set.me  || ''} placeholder="0" onChange={e => update(i, 'me',  parseInt(e.target.value) || 0)} style={numStyle} />
          <span style={{ fontSize: 16, color: dim, fontWeight: 700 }}>—</span>
          <input type="number" value={set.opp || ''} placeholder="0" onChange={e => update(i, 'opp', parseInt(e.target.value) || 0)} style={numStyle} />
          <button onClick={() => onChange(sets.filter((_, j) => j !== i))} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.10)', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      ))}
      {sets.length < 5 && (
        <button onClick={() => onChange([...sets, { me: 0, opp: 0 }])} style={{ width: '100%', padding: '10px', background: 'none', border: `1px dashed ${bord}`, borderRadius: 10, color: '#06B6D4', fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: sets.length > 0 ? 10 : 0 }}>
          {t('record.matchScoreAddSet')}
        </button>
      )}
      {sets.length > 0 && (
        <p style={{ fontSize: 16, fontWeight: 600, color: '#06B6D4', textAlign: 'center', margin: '10px 0 0' }}>
          {t('record.matchScoreSetsTo', { me: setsWonMe, opp: setsWonOpp })}
        </p>
      )}
    </div>
  )
}
