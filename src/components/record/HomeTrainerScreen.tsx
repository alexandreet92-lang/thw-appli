'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import HomeTrainerIntervals from './HomeTrainerIntervals'
import { createClient } from '@/lib/supabase/client'
import { HT_PROGRAMS, type HTProgram } from '@/types/hometrainer'
import type { CyclingPhase } from './CyclingControls'
import { useI18n } from '@/lib/i18n'

interface Props { onExit: () => void; onFinished: () => void }

function fmt(s: number) { const m = Math.floor(s/60), sec = s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` }

export default function HomeTrainerScreen({ onExit, onFinished }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted]   = useState(false)
  const [phase, setPhase]       = useState<CyclingPhase>('ready')
  const [watts, setWatts]       = useState(150)
  const [distM, setDistM]       = useState(0)
  const [ftp, setFtp]           = useState(250)
  const [program, setProgram]   = useState<HTProgram | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [showSummary, setShowSummary]   = useState(false)
  const [startedAt]             = useState(() => new Date().toISOString())
  const wattSamplesRef          = useRef<number[]>([])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    createClient().from('athlete_profiles').select('ftp_watts').maybeSingle()
      .then(({ data }) => { if (data?.ftp_watts) setFtp(data.ftp_watts) })
  }, [])

  useWakeLock(phase === 'running')
  const stopwatch = useStopwatch(phase === 'running')

  // Virtual distance accumulation
  useEffect(() => {
    if (phase !== 'running') return
    const tick = setInterval(() => {
      const speedKmh = Math.pow(Math.max(0, watts) / 2.8, 1/3) * 3.6
      const addM = speedKmh * 1000 / 3600
      setDistM(d => d + addM)
      wattSamplesRef.current = [...wattSamplesRef.current, watts]
    }, 1000)
    return () => clearInterval(tick)
  }, [phase, watts])

  const isDark = true
  const bg = '#0A0A0A', text = '#FFF', dim = 'rgba(255,255,255,0.40)', btnBg = 'rgba(255,255,255,0.10)'
  const avgWatts = wattSamplesRef.current.length > 0 ? Math.round(wattSamplesRef.current.reduce((a,b) => a+b,0) / wattSamplesRef.current.length) : 0
  const speedKmh = Math.pow(Math.max(0, watts) / 2.8, 1/3) * 3.6
  const IF = ftp > 0 ? avgWatts / ftp : 0
  const TSS = ftp > 0 ? Math.round((stopwatch.seconds * avgWatts * IF) / (ftp * 3600) * 100) : 0
  const calories = Math.round(stopwatch.seconds / 3600 * avgWatts * 3.6)

  const handleStop = () => {
    if (phase === 'running') setPhase('paused')
    setShowSaveForm(true)
  }
  const handleSave = async (formData: SessionFormData) => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport: 'hometrainer', title: formData.title,
          started_at: startedAt, duration_seconds: stopwatch.seconds, distance_m: Math.round(distM),
          avg_watts: avgWatts, calories, rpe: formData.rpe, comment: formData.comment,
          training_types: formData.trainingTypes, status: 'completed',
        })
        await sb.from('activities').insert({
          user_id: user.id, sport_type: 'hometrainer', title: formData.title,
          started_at: startedAt, moving_time_s: stopwatch.seconds, elapsed_time_s: stopwatch.seconds,
          distance_m: Math.round(distM), avg_watts: avgWatts, calories,
        })
      }
    } catch (e) { console.error('[ht] save error:', e) }
    setShowSaveForm(false); setShowSummary(true)
  }

  if (!mounted) return null

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: bg, color: text, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Summary */}
      {showSummary && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px', paddingTop: 'env(safe-area-inset-top)' }}>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>{t('record.homeTrainerSessionDone')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
            {[
              { l: t('record.commonDistance'), v: `${(distM/1000).toFixed(2)} km` }, { l: t('record.commonDuration'), v: fmt(stopwatch.seconds) },
              { l: t('record.homeTrainerWattsAvg'), v: `${avgWatts} w` }, { l: 'SM', v: String(TSS) },
              { l: 'IF', v: IF.toFixed(2) }, { l: t('record.homeTrainerCalories'), v: `${calories} kcal` },
            ].map(({ l, v }) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{l}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
          <button onClick={onFinished} style={{ padding: '14px 48px', borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonFinish')}</button>
        </div>
      )}

      {/* Header */}
      <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <button onClick={onExit} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <p style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, margin: 0 }}>Home Trainer</p>
        <span style={{ fontSize: 13, color: dim }}>FTP {ftp}w</span>
      </div>

      {/* Program selector — only when ready */}
      {phase === 'ready' && (
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 8px' }}>{t('record.homeTrainerProgram')}</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            <button onClick={() => setProgram(null)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: !program ? '#06B6D4' : btnBg, color: !program ? '#FFF' : text, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('record.homeTrainerFree')}</button>
            {HT_PROGRAMS.map(p => (
              <button key={p.name} onClick={() => setProgram(p)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: program?.name === p.name ? '#06B6D4' : btnBg, color: program?.name === p.name ? '#FFF' : text, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.nameKey ? t(p.nameKey) : p.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Main zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 24px', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        {/* Watts big display + controls */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{t('record.homeTrainerCurrentWatts')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setWatts(w => Math.max(0, w - 10))} style={{ width: 44, height: 44, borderRadius: '50%', background: btnBg, border: 'none', color: text, fontSize: 20, cursor: 'pointer' }}>−</button>
            <p style={{ fontSize: 72, fontWeight: 700, margin: 0, lineHeight: 1, minWidth: 140, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{watts}</p>
            <button onClick={() => setWatts(w => w + 10)} style={{ width: 44, height: 44, borderRadius: '50%', background: btnBg, border: 'none', color: text, fontSize: 20, cursor: 'pointer' }}>+</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, width: '100%', maxWidth: 320 }}>
          {[
            { l: t('record.commonDuration'),    v: fmt(stopwatch.seconds) },
            { l: t('record.commonDistance'), v: `${(distM/1000).toFixed(2)} km` },
            { l: t('record.commonSpeed'),  v: `${speedKmh.toFixed(1)} km/h` },
          ].map(({ l, v }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{l}</p>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>

        {program && phase !== 'ready' && (
          <HomeTrainerIntervals program={program} elapsedSec={stopwatch.seconds} ftp={ftp} isDark={isDark} />
        )}
      </div>

      {/* Controls */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)', background: 'rgba(10,10,10,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
        {phase === 'ready' && (
          <button onClick={() => setPhase('running')} style={{ flex: 1, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonStart')}</button>
        )}
        {phase === 'running' && <>
          <button onClick={() => setPhase('paused')} style={{ flex: 1, height: 52, borderRadius: 14, background: btnBg, border: 'none', color: text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonPause')}</button>
          <button onClick={handleStop} style={{ flex: 1, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.15)', border: 'none', color: '#EF4444', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonFinish')}</button>
        </>}
        {phase === 'paused' && <>
          <button onClick={() => setPhase('running')} style={{ flex: 1, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonResume')}</button>
          <button onClick={handleStop} style={{ flex: 1, height: 52, borderRadius: 14, background: btnBg, border: 'none', color: text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonFinish')}</button>
        </>}
      </div>

      {showSaveForm && <SessionSaveForm sport="hometrainer" startedAt={startedAt} onBack={() => setShowSaveForm(false)} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return createPortal(content, document.body)
}
