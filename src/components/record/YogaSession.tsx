'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useYogaSession } from '@/hooks/useYogaSession'
import { createClient } from '@/lib/supabase/client'
import type { YogaSessionExercise } from '@/types/yoga'
import AICoachingTip from './AICoachingTip'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import YogaSettings from './YogaSettings'

interface Props {
  exercises: YogaSessionExercise[]
  title: string
  isDark: boolean
  onClose: () => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function YogaSession({ exercises, title, isDark, onClose }: Props) {
  const [mounted, setMounted]       = useState(false)
  const [startedAt]                 = useState(() => new Date().toISOString())
  const [aiEnabled, setAiEnabled]   = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSave, setShowSave]     = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const session = useYogaSession(exercises)
  useWakeLock(session.phase === 'exercise' || session.phase === 'rest')
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (session.phase === 'finished') setShowSave(true) }, [session.phase])

  if (!mounted) return null
  const bg   = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const btnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'

  const cur  = exercises[session.currentIdx]
  const next = exercises[session.currentIdx + 1]
  const progress = Math.max(0, Math.min(1, (session.currentDuration - session.remaining) / (session.currentDuration || 1)))
  const isRunning = session.phase === 'exercise' || session.phase === 'rest'

  const handleSave = async (formData: SessionFormData) => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('activities').insert({
        user_id: user.id, sport: 'yoga',
        title: formData.title, started_at: startedAt,
        moving_time_s: session.elapsed, elapsed_time_s: session.elapsed,
        calories: Math.round(session.elapsed / 60 * 3),
      })
    }
    onClose()
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <button onClick={() => { if (isRunning) { session.pause(); setConfirmClose(true) } else setConfirmClose(true) }} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <p style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#06B6D4', fontVariantNumeric: 'tabular-nums' }}>{fmt(session.elapsed)}</span>
          <button onClick={() => setSettingsOpen(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9"/></svg>
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20, overflowY: 'auto' }}>

        {session.phase === 'rest' ? (
          /* Rest screen */
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>REPOS</p>
            <p style={{ fontSize: 80, fontWeight: 700, color: text, margin: '0 0 12px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{session.restRemaining}</p>
            {next && <p style={{ fontSize: 16, color: '#06B6D4', fontWeight: 600, margin: 0 }}>Prochain : {next.name}</p>}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: dim, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
              EXERCICE {session.currentIdx + 1} / {exercises.length}
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: text, textAlign: 'center', margin: 0 }}>{cur?.name}</h2>

            {/* Ring */}
            <div style={{ width: 160, height: 160, borderRadius: '50%', border: '4px solid rgba(6,182,212,0.15)', background: `conic-gradient(#06B6D4 ${progress}turn, rgba(6,182,212,0.10) 0turn)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 136, height: 136, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 52, fontWeight: 700, color: text, margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{session.remaining}</p>
              </div>
            </div>

            {session.phase === 'idle' && (
              <button onClick={session.start} style={{ padding: '14px 40px', borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Démarrer</button>
            )}

            {cur && <AICoachingTip exercise={cur} enabled={aiEnabled && session.phase === 'exercise'} isDark={isDark} />}

            {next && session.phase === 'exercise' && session.remaining <= 5 && (
              <p style={{ fontSize: 13, color: '#8C8C8C', textAlign: 'center', margin: 0, animation: 'fadein 300ms' }}>
                Suivant : {next.name} · {next.duration_seconds}s
              </p>
            )}
            {next && session.phase !== 'idle' && session.remaining > 5 && (
              <p style={{ fontSize: 13, color: dim, textAlign: 'center', margin: 0 }}>Suivant : {next.name} · {next.duration_seconds}s</p>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {session.phase !== 'idle' && session.phase !== 'finished' && (
        <div style={{ padding: '12px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),16px)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={session.skip} style={{ flex: 1, height: 48, borderRadius: 14, background: btnBg, border: 'none', color: text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Passer</button>
          <button onClick={isRunning ? session.pause : session.resume} style={{ flex: 2, height: 48, borderRadius: 14, background: isRunning ? 'rgba(6,182,212,0.15)' : 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: isRunning ? '#06B6D4' : '#FFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {isRunning ? 'Pause' : 'Reprendre'}
          </button>
          {session.phase === 'exercise' && (
            <button onClick={() => session.addTime(30)} style={{ flex: 1, height: 48, borderRadius: 14, background: btnBg, border: 'none', color: text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+30s</button>
          )}
        </div>
      )}

      {/* Confirm close */}
      {confirmClose && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: isDark ? '#1A1A1A' : '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 0 8px' }}>Quitter la séance ?</p>
            <p style={{ fontSize: 14, color: dim, margin: '0 0 20px' }}>La progression sera perdue.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setConfirmClose(false); session.resume() }} style={{ flex: 1, height: 44, borderRadius: 12, background: btnBg, border: 'none', color: text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 12, background: '#EF4444', border: 'none', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <YogaSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} aiTipsEnabled={aiEnabled} onToggleAI={setAiEnabled} />
      {showSave && <SessionSaveForm sport="yoga" startedAt={startedAt} onBack={() => { setShowSave(false); onClose() }} onSave={handleSave} isDark={isDark} />}
      <style>{`@keyframes fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )

  return createPortal(content, document.body)
}
