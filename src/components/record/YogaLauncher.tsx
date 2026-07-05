'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { YogaSessionExercise, YogaPlannedSession } from '@/types/yoga'
import { DEFAULT_YOGA_EXERCISES } from '@/types/yoga'
import YogaSessionBuilder from './YogaSessionBuilder'
import { useI18n } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (exercises: YogaSessionExercise[], title: string) => void
  isDark: boolean
}

export default function YogaLauncher({ open, onClose, onStart, isDark }: Props) {
  const { t } = useI18n()
  const [sessions, setSessions]       = useState<YogaPlannedSession[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [closing, setClosing]         = useState(false)

  const bg   = isDark ? 'var(--bg-card, #111)' : '#FFF'
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const surf = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const bord = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  useEffect(() => {
    if (!open) return
    setClosing(false)
    createClient().from('planned_sessions').select('id,title,blocks,target_duration_min').eq('sport', 'yoga').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setSessions((data ?? []).map(d => ({
        id: d.id, title: d.title,
        target_duration_min: d.target_duration_min ?? 30,
        exercises: (d.blocks ?? []) as YogaSessionExercise[],
      }))))
  }, [open])

  if (!open && !builderOpen) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  const launchFree = () => {
    const free = DEFAULT_YOGA_EXERCISES.slice(0, 6).map((e, i) => ({
      exerciseId: `free-${i}`, name: e.name, category: e.category,
      duration_seconds: e.default_duration_seconds,
    }))
    onStart(free, t('record.yogaFreeSession'))
  }

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', animation: closing ? 'ylnch-out 200ms ease-in forwards' : 'ylnch-in 200ms ease-out forwards' }} />
          <div className={closing ? 'sheet-close' : 'sheet-open'} style={{ position: 'relative', width: '100%', maxHeight: '80vh', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.18)', fontFamily: 'DM Sans, sans-serif', color: text, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: dim }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', flexShrink: 0 }}>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>{t('record.yogaLauncherTitle')}</p>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: dim, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {/* CTA buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <button onClick={() => setBuilderOpen(true)} style={{ flex: 1, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('record.yogaCreateSession')}</button>
                <button onClick={launchFree} style={{ flex: 1, height: 52, borderRadius: 14, background: surf, border: `1px solid ${bord}`, color: text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('record.yogaLaunchFree')}</button>
              </div>

              {/* Mes séances */}
              {sessions.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{t('record.yogaMySessions')}</p>
                  {sessions.map(s => (
                    <button key={s.id} onClick={() => onStart(s.exercises, s.title)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: surf, border: `1px solid ${bord}`, borderRadius: 12, color: text, cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{s.title}</p>
                        <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>{s.exercises.length} {t('record.yogaExercisesLabel')} · {s.target_duration_min} min</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#06B6D4"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  ))}
                </>
              )}

              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', borderTop: `1px solid ${sep}` }}>
                  <p style={{ fontSize: 14, color: dim, margin: 0 }}>{t('record.yogaNoSavedSession')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {builderOpen && (
        <YogaSessionBuilder
          isDark={isDark}
          onClose={() => setBuilderOpen(false)}
          onStart={(exs, title) => { setBuilderOpen(false); onStart(exs, title) }}
        />
      )}

      <style>{`
        @keyframes ylnch-in  { from{opacity:0} to{opacity:1} }
        @keyframes ylnch-out { from{opacity:1} to{opacity:0} }
      `}</style>
    </>
  )
}
