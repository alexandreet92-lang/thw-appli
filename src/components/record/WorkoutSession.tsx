'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise, CompletedSet, WorkoutSummaryData } from '@/types/workout'
import SeriesView from './workout/SeriesView'
import LapView from './workout/LapView'
import SupersetView from './workout/SupersetView'
import EMOMView from './workout/EMOMView'
import TabataView from './workout/TabataView'
import ExerciseSearch from './workout/ExerciseSearch'
import WorkoutSettings from './WorkoutSettings'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'

interface Props {
  sport: 'gym' | 'hyrox'
  exercises: WorkoutExercise[]
  planTitle?: string
  onClose: () => void
  isDark: boolean
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export default function WorkoutSession({ sport, exercises: initialExercises, planTitle, onClose, isDark }: Props) {
  const [mounted, setMounted] = useState(false)
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialExercises)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [startedAt] = useState(new Date().toISOString())
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const accent = sport === 'gym' ? '#8B5CF6' : '#EF4444'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    navigator.wakeLock?.request('screen').then(lock => { wakeLockRef.current = lock }).catch(() => {})
    return () => { wakeLockRef.current?.release() }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const handleSetDone = useCallback((set: CompletedSet) => {
    setCompletedSets(prev => [...prev, set])
  }, [])

  const current = exercises[currentIdx]
  const totalVolumeKg = completedSets.reduce((acc, s) => acc + s.reps * s.weightKg, 0)

  const handleSave = async (formData: SessionFormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const summaryData: WorkoutSummaryData = {
      id: null, sport, durationSec: elapsed,
      exercises, completedSets, totalVolumeKg,
      calories: Math.round(elapsed / 60 * 7),
      rpe: formData.rpe, title: formData.title,
    }
    await supabase.from('workout_sessions').insert({
      user_id: user.id, sport, status: 'done',
      started_at: startedAt, ended_at: new Date().toISOString(),
      duration_seconds: elapsed,
      title: formData.title,
      training_types: formData.trainingTypes,
      rpe: formData.rpe,
      comment: formData.comment,
      calories: summaryData.calories,
      exercises_detail: exercises,
      total_volume_kg: totalVolumeKg,
      sets_completed: completedSets.length,
    })
    onClose()
  }

  const content = (
    <div style={{ position:'fixed', inset:0, zIndex:10002, background:'var(--bg-card)', display:'flex', flexDirection:'column', fontFamily:'DM Sans, sans-serif', paddingTop:'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid var(--border)', gap:10 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-card2)', border:'none', color:'var(--text)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex:1, textAlign:'center' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{planTitle || (sport === 'gym' ? 'Muscu' : 'Hyrox')}</p>
          <p style={{ fontSize:12, color:accent, margin:0, fontWeight:600 }}>{formatDuration(elapsed)}</p>
        </div>
        <button onClick={() => setShowSettings(true)} style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-card2)', border:'none', color:'var(--text-mid)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M11.5 4.5l1.4-1.4M3.1 12.9l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Exercise tabs */}
      <div style={{ display:'flex', overflowX:'auto', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {exercises.map((ex, i) => (
          <button key={ex.id} onClick={() => setCurrentIdx(i)}
            style={{ flexShrink:0, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', borderBottom: i === currentIdx ? `2px solid ${accent}` : '2px solid transparent', marginBottom:-1, color: i === currentIdx ? accent : 'var(--text-mid)', fontSize:13, fontWeight: i === currentIdx ? 600 : 400, whiteSpace:'nowrap' }}>
            {ex.name}
          </button>
        ))}
        <button onClick={() => setShowSearch(true)} style={{ flexShrink:0, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', color:'var(--text-mid)', fontSize:20, lineHeight:1 }}>+</button>
      </div>

      {/* Current view */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {exercises.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, padding:32 }}>
            <p style={{ fontSize:15, color:'var(--text-mid)', textAlign:'center' }}>Aucun exercice — appuie sur + pour en ajouter</p>
            <button onClick={() => setShowSearch(true)} style={{ padding:'12px 28px', borderRadius:14, background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:'none', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' }}>
              Ajouter un exercice
            </button>
          </div>
        )}
        {current && (
          <>
            {current.mode === 'series' && <SeriesView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'circuit' && <LapView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'superset' && <SupersetView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'emom' && <EMOMView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'tabata' && <TabataView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
          </>
        )}
      </div>

      {/* Bottom stats */}
      <div style={{ flexShrink:0, padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-around', paddingBottom:'max(env(safe-area-inset-bottom), 12px)' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>{completedSets.length}</p>
          <p style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', margin:'2px 0 0', letterSpacing:'0.08em' }}>Séries</p>
        </div>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>{Math.round(totalVolumeKg)}</p>
          <p style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', margin:'2px 0 0', letterSpacing:'0.08em' }}>Vol. kg</p>
        </div>
        <button onClick={() => setShowSave(true)} style={{ padding:'8px 20px', borderRadius:12, background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:'none', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
          Terminer
        </button>
      </div>

      {showSearch && <ExerciseSearch sport={sport} onAdd={ex => setExercises(prev => [...prev, ex])} onClose={() => setShowSearch(false)} isDark={isDark} />}
      {showSettings && <WorkoutSettings open={showSettings} onClose={() => setShowSettings(false)} isDark={isDark} sport={sport} />}
      {showSave && <SessionSaveForm sport={sport} startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return mounted ? createPortal(content, document.body) : null
}
