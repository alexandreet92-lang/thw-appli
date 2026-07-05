'use client'
import { useI18n } from '@/lib/i18n'
import type { SwimInterval } from './SwimmingIntervals'

export interface SwimSavedData {
  id: string | null
  durationSec: number
  distanceM: number
  poolSize: string
  calories: number
  rpe: number
  intervals: SwimInterval[]
}

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function pace100m(distM: number, durSec: number): string {
  if (distM <= 0 || durSec <= 0) return '--'
  const sec = (durSec / distM) * 100
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} /100m`
}

interface Props {
  session: SwimSavedData
  onClose: () => void
}

export default function SwimmingSummary({ session, onClose }: Props) {
  const { t } = useI18n()
  const poolNum = parseInt(session.poolSize)
  const lengths = !isNaN(poolNum) && poolNum > 0 && session.distanceM > 0
    ? Math.round(session.distanceM / poolNum)
    : null

  const stats: { label: string; value: string; unit: string }[] = [
    { label: t('record.swimStatDistance'),   value: String(session.distanceM), unit: 'm' },
    { label: t('record.swimStatDuration'),      value: fmtDur(session.durationSec), unit: '' },
    ...(lengths != null ? [{ label: t('record.swimStatLengths'), value: String(lengths), unit: 'lng' }] : []),
    { label: t('record.swimStatAvgPace'),  value: pace100m(session.distanceM, session.durationSec), unit: '' },
    { label: t('record.swimStatCalories'),   value: String(session.calories), unit: 'kcal' },
    { label: 'RPE',        value: String(session.rpe), unit: '/ 10' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10005, background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      animation: 'swim-sum-in 300ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes swim-sum-in { from { transform: translateY(40px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>

      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>
          {t('record.swimSummaryTitle')}
        </span>
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#06B6D4', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          {t('record.swimSummaryClose')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 1, background: 'var(--border)', borderRadius: 16, overflow: 'hidden',
          border: '1px solid var(--border)', marginBottom: 16,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: '16px 12px', background: 'var(--bg-card)', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>{s.value}</p>
              {s.unit && <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{s.unit}</p>}
            </div>
          ))}
        </div>

        {session.intervals.length > 0 && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {t('record.swimSets')}
            </p>
            {session.intervals.map((iv, idx) => (
              <div key={iv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, marginBottom: 6, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t('record.swimSet', { n: idx + 1 })} — {iv.distanceM}m</span>
                <span style={{ fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>{pace100m(iv.distanceM, iv.durationSec)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
