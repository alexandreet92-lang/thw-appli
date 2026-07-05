'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { YogaSessionExercise } from '@/types/yoga'
import YogaExercisePicker from './YogaExercisePicker'

interface Props {
  isDark: boolean
  onClose: () => void
  onStart: (exercises: YogaSessionExercise[], title: string) => void
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m}min ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`
}

const DURATIONS = [15, 30, 45, 60, 90]

export default function YogaSessionBuilder({ isDark, onClose, onStart }: Props) {
  const { t } = useI18n()
  const [title, setTitle]         = useState('')
  const [targetMin, setTargetMin] = useState(30)
  const [exercises, setExercises] = useState<YogaSessionExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving]       = useState(false)

  const bg   = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const surf = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const bord = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  const totalSec = exercises.reduce((s, e) => s + e.duration_seconds, 0)

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...exercises]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setExercises(arr)
  }

  const handleSave = async () => {
    if (!exercises.length) return
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const finalTitle = title.trim() || t('record.yogaBuilderDefaultTitle')
    if (user) {
      await sb.from('planned_sessions').insert({
        user_id: user.id, sport: 'yoga',
        title: finalTitle, blocks: exercises,
        target_duration_min: targetMin,
      })
    }
    setSaving(false)
    onStart(exercises, finalTitle)
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10003, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', animation: 'ybuilder-in 280ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes ybuilder-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${sep}`, position: 'relative' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: surf, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600, color: text }}>{t('record.yogaBuilderNewSession')}</span>
        <button onClick={handleSave} disabled={saving || !exercises.length} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 10, background: 'none', border: 'none', color: exercises.length ? '#06B6D4' : dim, fontSize: 15, fontWeight: 600, cursor: exercises.length ? 'pointer' : 'default' }}>
          {saving ? '…' : t('record.yogaBuilderSave')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: 120 }}>
        {/* Nom */}
        <p style={{ fontSize: 10, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{t('record.yogaBuilderSessionName')}</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('record.yogaBuilderNamePlaceholder')} style={{ width: '100%', boxSizing: 'border-box', background: surf, border: `1px solid ${bord}`, borderRadius: 12, padding: '12px 16px', fontSize: 16, color: text, outline: 'none', fontFamily: 'DM Sans, sans-serif', marginBottom: 24 }} />

        {/* Durée cible */}
        <p style={{ fontSize: 10, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{t('record.yogaBuilderTargetDuration')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {DURATIONS.map(d => (
            <button key={d} onClick={() => setTargetMin(d)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: targetMin === d ? '#06B6D4' : surf, color: targetMin === d ? '#FFF' : text, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{d} min</button>
          ))}
        </div>

        {/* Exercices */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{t('record.yogaBuilderExercises', { n: exercises.length })}</p>
          <button onClick={() => setPickerOpen(true)} style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(6,182,212,0.12)', border: 'none', color: '#06B6D4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('record.settingsAdd')}</button>
        </div>

        {exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: dim }}>
            <p style={{ fontSize: 14, margin: 0 }}>{t('record.yogaBuilderNoExercise')}</p>
          </div>
        )}

        {exercises.map((ex, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: surf, border: `1px solid ${bord}`, borderRadius: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, color: text, margin: 0, fontWeight: 500 }}>{ex.name}</p>
            </div>
            <input type="number" value={ex.duration_seconds} min={5} onChange={e => { const arr = [...exercises]; arr[i] = { ...arr[i], duration_seconds: Number(e.target.value) }; setExercises(arr) }} style={{ width: 60, background: 'transparent', border: `1px solid ${bord}`, borderRadius: 8, padding: '6px 8px', fontSize: 14, color: text, outline: 'none', textAlign: 'center' }} />
            <span style={{ fontSize: 12, color: dim }}>s</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 6, background: surf, border: `1px solid ${bord}`, color: i === 0 ? dim : text, cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === exercises.length - 1} style={{ width: 28, height: 28, borderRadius: 6, background: surf, border: `1px solid ${bord}`, color: i === exercises.length - 1 ? dim : text, cursor: i === exercises.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
            <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}

        {exercises.length > 0 && (
          <p style={{ fontSize: 13, color: dim, textAlign: 'right', marginTop: 8 }}>{t('record.yogaBuilderTotalDuration')} {fmt(totalSec)}</p>
        )}
      </div>

      {exercises.length > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)', background: isDark ? 'linear-gradient(transparent,#0A0A0A 40%)' : 'linear-gradient(transparent,#FFF 40%)' }}>
          <button onClick={() => onStart(exercises, title.trim() || t('record.yogaBuilderDefaultTitle'))} style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}>
            {t('record.yogaBuilderLaunch')}
          </button>
        </div>
      )}

      <YogaExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={ex => { setExercises(prev => [...prev, ex]); setPickerOpen(false) }} isDark={isDark} />
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
