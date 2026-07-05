'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import RPESlider from './RPESlider'
import SwimmingPoolSelector from './SwimmingPoolSelector'
import SwimmingStrokeSelector from './SwimmingStrokeSelector'
import SwimmingIntervals, { type SwimInterval } from './SwimmingIntervals'
import SwimmingSummary, { type SwimSavedData } from './SwimmingSummary'
import { currentLocale } from '@/lib/i18n'

interface Props { onClose: () => void }

function autoTitle(): string {
  const d = new Date()
  const day = d.toLocaleDateString(currentLocale(), { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString(currentLocale(), { month: 'long' })
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `Natation · ${cap(day)} ${num} ${month}`
}

const LABEL = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', color: 'var(--text-dim)' as const, margin: '0 0 10px', display: 'block',
}

const INPUT = {
  width: '100%', boxSizing: 'border-box' as const,
  background: 'var(--bg-card2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '12px 16px',
  fontSize: 15, color: 'var(--text)', outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
}

const NUM_SM = {
  ...INPUT, width: 72, padding: '12px 8px', textAlign: 'center' as const,
}

export default function SwimmingForm({ onClose }: Props) {
  const { t } = useI18n()
  const [isDark, setIsDark] = useState(false)
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])

  const [title, setTitle]         = useState(autoTitle())
  const [poolSize, setPoolSize]   = useState('25')
  const [stroke, setStroke]       = useState('')
  const [hours, setHours]         = useState(0)
  const [mins, setMins]           = useState(0)
  const [secs, setSecs]           = useState(0)
  const [distM, setDistM]         = useState(0)
  const [distUnit, setDistUnit]   = useState<'m' | 'yd'>('m')
  const [intervals, setIntervals] = useState<SwimInterval[]>([])
  const [rpe, setRpe]             = useState(5)
  const [comment, setComment]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState<SwimSavedData | null>(null)

  const durationSec  = hours * 3600 + mins * 60 + secs
  const distMeters   = distUnit === 'yd' ? Math.round(distM * 0.9144) : distM
  const totalDistM   = intervals.length > 0 ? intervals.reduce((s, i) => s + i.distanceM, 0) : distMeters
  const totalDurSec  = intervals.length > 0 ? (intervals.reduce((s, i) => s + i.durationSec, 0) || durationSec) : durationSec
  const poolNum      = parseInt(poolSize)
  const lengths      = !isNaN(poolNum) && poolNum > 0 && totalDistM > 0 ? Math.round(totalDistM / poolNum) : null
  const fmtDur       = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const handleSave = async () => {
    if (saving || totalDurSec === 0) return
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setSaving(false); return }
      const calories = Math.round(totalDurSec / 60 * 8)
      const now = Date.now()
      const { data } = await sb.from('workout_sessions').insert({
        user_id: user.id, sport: 'swimming',
        started_at: new Date(now - totalDurSec * 1000).toISOString(),
        ended_at:   new Date(now).toISOString(),
        duration_seconds: totalDurSec, distance_m: totalDistM,
        avg_speed_kmh: totalDurSec > 0 ? (totalDistM / totalDurSec) * 3.6 : 0,
        max_speed_kmh: 0, calories, status: 'completed',
        title: title.trim() || autoTitle(), training_types: ['natation'],
        rpe, comment,
        pool_size: poolSize, swim_stroke: stroke || null,
        swim_intervals: intervals.length > 0 ? intervals : null,
        distance_unit: distUnit,
      }).select('id').single()
      setSaved({ id: data?.id ?? null, durationSec: totalDurSec, distanceM: totalDistM, poolSize, calories, rpe, intervals })
    } catch (e) { console.error('[swimming] save error:', e) }
    setSaving(false)
  }

  if (saved) return <SwimmingSummary session={saved} onClose={onClose} />

  const NumInput = ({ val, set, max, label }: { val: number; set: (v: number) => void; max: number; label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <input
        type="number" value={val || ''} placeholder="0" min={0} max={max}
        onChange={e => set(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
        style={NUM_SM}
      />
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', animation: 'swim-up 300ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes swim-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}>×</button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>{t('record.swimFormTitle')}</span>
        <button onClick={handleSave} disabled={saving} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#06B6D4', fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? '…' : t('record.swimSave')}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: 120 }}>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelTitle')}</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle()} style={INPUT} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelPoolSize')}</label>
          <SwimmingPoolSelector value={poolSize} onChange={setPoolSize} isDark={isDark} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelStroke')}</label>
          <SwimmingStrokeSelector value={stroke} onChange={setStroke} isDark={isDark} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelDuration')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <NumInput val={hours} set={setHours} max={23} label="h" />
            <NumInput val={mins}  set={setMins}  max={59} label="min" />
            <NumInput val={secs}  set={setSecs}  max={59} label="sec" />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 24, fontWeight: 700, color: '#06B6D4', textAlign: 'center' as const }}>{fmtDur}</p>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelDistance')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" value={distM || ''} placeholder="0" min={0}
              step={distUnit === 'm' && !isNaN(poolNum) && poolNum > 0 ? 50 : 100}
              onChange={e => setDistM(parseInt(e.target.value) || 0)}
              style={{ ...INPUT, flex: 1 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['m', 'yd'] as const).map(u => (
                <button key={u} onClick={() => setDistUnit(u)} style={{ padding: '10px 14px', borderRadius: 10, border: distUnit === u ? 'none' : '1px solid var(--border)', background: distUnit === u ? '#06B6D4' : 'transparent', color: distUnit === u ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{u}</button>
              ))}
            </div>
          </div>
          {lengths != null && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>{totalDistM}m → {lengths} {t('record.swimLengths')}</p>}
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelIntervals')}</label>
          <p style={{ margin: '-6px 0 12px', fontSize: 12, color: 'var(--text-dim)' }}>{t('record.swimIntervalsHint')}</p>
          <SwimmingIntervals intervals={intervals} onChange={setIntervals} poolSizeM={isNaN(poolNum) ? 0 : poolNum} isDark={isDark} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.swimLabelRpe')}</label>
          <p style={{ margin: '-6px 0 16px', fontSize: 12, color: 'var(--text-dim)' }}>{t('record.swimRpeHint')}</p>
          <RPESlider value={rpe} onChange={setRpe} isDark={isDark} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL}>{t('record.swimLabelComment')}</label>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)} rows={4}
            placeholder={t('record.swimCommentPlaceholder')}
            style={{ ...INPUT, resize: 'none' as const }}
          />
        </div>
      </div>

      {/* Sticky save button */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', background: 'linear-gradient(transparent, var(--bg) 40%)' }}>
        <button
          onClick={handleSave} disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}
        >
          {saving ? t('record.swimSaving') : t('record.swimSaveActivity')}
        </button>
      </div>
    </div>
  )
}
