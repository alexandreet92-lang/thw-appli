'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import SeriesView from './workout/SeriesView'
import LapView from './workout/LapView'
import SupersetView from './workout/SupersetView'
import EMOMView from './workout/EMOMView'
import TabataView from './workout/TabataView'
import ExerciseSearch from './workout/ExerciseSearch'
import RecordExercisePicker from './workout/RecordExercisePicker'
import HeartRatePanel from './workout/HeartRatePanel'
import RestTimer from './workout/RestTimer'
import { useHeartRate } from '@/lib/record/useHeartRate'
import WorkoutSettings from './WorkoutSettings'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import { useI18n } from '@/lib/i18n'

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
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialExercises)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSave, setShowSave] = useState(false)
  // La séance ne démarre PAS automatiquement : on montre d'abord un récap + un
  // bouton « Commencer ». Le chrono et le wake-lock ne tournent qu'une fois lancé.
  const [started, setStarted] = useState(false)
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString())
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const accent = sport === 'gym' ? '#06B6D4' : '#EF4444'
  const hr = useHeartRate()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!started) return
    navigator.wakeLock?.request('screen').then(lock => { wakeLockRef.current = lock }).catch(() => {})
    return () => { wakeLockRef.current?.release() }
  }, [started])

  useEffect(() => {
    if (!started) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [started])

  function beginSession() { setStartedAt(new Date().toISOString()); setElapsed(0); setStarted(true) }

  const handleSetDone = useCallback((set: CompletedSet) => {
    setCompletedSets(prev => [...prev, set])
  }, [])
  // Enchaînement des circuits : on insère une récup configurable (±15s) entre
  // deux blocs. Démarre à 120s par défaut, ajustable dans le timer.
  const [betweenRest, setBetweenRest] = useState<number | null>(null)
  const goNext = () => { if (currentIdx < exercises.length - 1) setBetweenRest(120) }
  const finishRest = () => { setBetweenRest(null); setCurrentIdx(i => Math.min(i + 1, exercises.length - 1)) }

  // Édition de l'ordre / suppression de blocs pendant la séance.
  const [showManage, setShowManage] = useState(false)
  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= exercises.length) return
    const arr = [...exercises];[arr[i], arr[j]] = [arr[j], arr[i]]
    setExercises(arr)
    setCurrentIdx(c => (c === i ? j : c === j ? i : c))
  }
  function removeBlock(i: number) {
    setExercises(prev => prev.filter((_, k) => k !== i))
    setCurrentIdx(c => Math.max(0, c >= i ? c - 1 : c))
  }

  const current = exercises[currentIdx]
  const totalVolumeKg = completedSets.reduce((acc, s) => acc + s.reps * s.weightKg, 0)

  const handleSave = async (formData: SessionFormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sessionId = crypto.randomUUID()
    // Upload des photos (best-effort) → bucket workout-photos, URLs publiques.
    const photoUrls: string[] = []
    for (let i = 0; i < (formData.photos ?? []).length; i++) {
      const f = formData.photos![i]
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/${sessionId}/${i}.${ext}`
      const { error } = await supabase.storage.from('workout-photos').upload(path, f, { upsert: true })
      if (!error) photoUrls.push(supabase.storage.from('workout-photos').getPublicUrl(path).data.publicUrl)
    }
    await supabase.from('workout_sessions').insert({
      id: sessionId, user_id: user.id, sport, status: 'done',
      started_at: startedAt, ended_at: new Date().toISOString(),
      duration_seconds: elapsed,
      title: formData.title,
      training_types: formData.trainingTypes,
      rpe: formData.rpe,
      comment: formData.comment,
      calories: Math.round(elapsed / 60 * 7),
      exercises_detail: exercises,
      total_volume_kg: totalVolumeKg,
      sets_completed: completedSets.length,
      completed_sets: completedSets,   // reps/charge RÉELLEMENT faits par série/tour
      avg_hr: hr.avg, max_hr: hr.max, min_hr: hr.min,
      photos: photoUrls.length ? photoUrls : null,
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
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{planTitle || (sport === 'gym' ? t('record.workoutMuscu') : 'Hyrox')}</p>
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
        {exercises.length > 0 && (
          <button onClick={() => setShowManage(true)} aria-label={t('record.workoutReorder')} style={{ flexShrink:0, padding:'10px 12px', background:'none', border:'none', cursor:'pointer', color:'var(--text-mid)', display:'flex', alignItems:'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
          </button>
        )}
      </div>

      {/* Current view */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {exercises.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, padding:32 }}>
            <p style={{ fontSize:15, color:'var(--text-mid)', textAlign:'center' }}>{t('record.workoutNoExercise')}</p>
            <button onClick={() => setShowSearch(true)} style={{ padding:'12px 28px', borderRadius:14, background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:'none', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' }}>
              {t('record.workoutAddExercise')}
            </button>
          </div>
        )}
        {betweenRest != null && (
          <div style={{ padding:'8px 0' }}>
            <p style={{ textAlign:'center', fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-dim)', margin:'8px 0 0' }}>{t('record.workoutRestBetweenCircuits')}</p>
            <RestTimer seconds={betweenRest} onDone={finishRest} isDark={isDark} accent={accent} />
          </div>
        )}
        {betweenRest == null && current && (
          <>
            {current.mode === 'series' && <SeriesView key={current.id} exercise={current} onSetDone={handleSetDone} onComplete={goNext} hasNext={currentIdx < exercises.length - 1} isDark={isDark} accent={accent} />}
            {current.mode === 'circuit' && <LapView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'superset' && <SupersetView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'emom' && <EMOMView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
            {current.mode === 'tabata' && <TabataView key={current.id} exercise={current} onSetDone={handleSetDone} isDark={isDark} accent={accent} />}
          </>
        )}
      </div>

      {/* Fréquence cardiaque (capteur BLE) */}
      <div style={{ flexShrink:0 }}><HeartRatePanel hr={hr} accent={accent} /></div>

      {/* Bottom stats */}
      <div style={{ flexShrink:0, padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-around', paddingBottom:'max(env(safe-area-inset-bottom), 12px)' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>{completedSets.length}</p>
          <p style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', margin:'2px 0 0', letterSpacing:'0.08em' }}>{t('record.workoutSets')}</p>
        </div>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>{Math.round(totalVolumeKg)}</p>
          <p style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', margin:'2px 0 0', letterSpacing:'0.08em' }}>{t('record.workoutVolKg')}</p>
        </div>
        <button onClick={() => setShowSave(true)} style={{ padding:'8px 20px', borderRadius:12, background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:'none', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
          {t('record.workoutFinish')}
        </button>
      </div>

      {showSearch && (sport === 'gym'
        ? <RecordExercisePicker accent={accent} onAdd={ex => setExercises(prev => [...prev, ex])} onClose={() => setShowSearch(false)} />
        : <ExerciseSearch sport={sport} onAdd={ex => setExercises(prev => [...prev, ex])} onClose={() => setShowSearch(false)} isDark={isDark} />)}
      {showManage && (
        <div onClick={() => setShowManage(false)} style={{ position:'fixed', inset:0, zIndex:10006, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', background:'var(--bg)', borderRadius:'18px 18px 0 0', padding:20, paddingBottom:'max(env(safe-area-inset-bottom), 20px)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:0 }}>{t('record.workoutOrganizeSession')}</h3>
              <button onClick={() => setShowManage(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:20, padding:4 }}>✕</button>
            </div>
            {exercises.map((ex, i) => (
              <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8 }}>
                <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i + 1}. {ex.name}</span>
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label={t('record.settingsMoveUp')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-mid)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1, padding:'4px 9px', fontSize:14 }}>↑</button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === exercises.length - 1} aria-label={t('record.settingsMoveDown')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-mid)', cursor: i === exercises.length - 1 ? 'default' : 'pointer', opacity: i === exercises.length - 1 ? 0.4 : 1, padding:'4px 9px', fontSize:14 }}>↓</button>
                <button onClick={() => removeBlock(i)} aria-label={t('record.settingsDelete')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'#ef4444', cursor:'pointer', padding:'4px 9px', fontSize:14 }}>×</button>
              </div>
            ))}
            <button onClick={() => { setShowManage(false); setShowSearch(true) }} style={{ width:'100%', padding:'11px', borderRadius:10, border:'1px dashed var(--border)', background:'transparent', color:accent, fontWeight:600, fontSize:14, cursor:'pointer', marginTop:4 }}>{t('record.workoutAddExercisePlus')}</button>
          </div>
        </div>
      )}
      {showSettings && <WorkoutSettings open={showSettings} onClose={() => setShowSettings(false)} isDark={isDark} sport={sport} />}
      {showSave && <SessionSaveForm sport={sport} startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark}
        summary={{ exos: exercises.length, sets: completedSets.length, volumeKg: totalVolumeKg, durationSec: elapsed }}
        hr={{ avg: hr.avg, min: hr.min, max: hr.max }}
        circuitTypes={Array.from(new Set(exercises.map(e => e.mode)))} />}
    </div>
  )

  // ── Récap avant lancement ──────────────────────────────────────
  function exoLine(ex: WorkoutExercise): string {
    if (ex.mode === 'circuit') return t('record.workoutCircuitLine', { r: ex.circuitRounds ?? 1, n: (ex.circuitExercises ?? []).length })
    if (ex.mode === 'emom') return `EMOM ${ex.emomMinutes ?? 0} min`
    if (ex.mode === 'tabata') return `Tabata ${ex.tabataRounds ?? 8}×`
    if (ex.mode === 'superset') return t('record.workoutSupersetLine', { n: ex.sets })
    return `${ex.sets} × ${ex.reps}${ex.weightKg ? ` · ${ex.weightKg} kg` : ''}`
  }
  const recap = (
    <div style={{ position:'fixed', inset:0, zIndex:10002, background:'var(--bg-card)', display:'flex', flexDirection:'column', fontFamily:'DM Sans, sans-serif', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid var(--border)', gap:10 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-card2)', border:'none', color:'var(--text)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ flex:1, textAlign:'center', fontSize:14, fontWeight:600, color:'var(--text)' }}>{planTitle || (sport === 'gym' ? t('record.workoutMuscu') : 'Hyrox')}</span>
        <div style={{ width:36 }} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
        <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-dim)', margin:'0 0 14px' }}>{t('record.workoutRecap')} · {exercises.length} {t(exercises.length > 1 ? 'record.workoutBlocksPlural' : 'record.workoutBlockSingular')}</p>
        {exercises.length === 0 && <p style={{ fontSize:14, color:'var(--text-mid)' }}>{t('record.workoutEmptySession')}</p>}
        {exercises.map((ex, i) => (
          <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:accent, width:18, flexShrink:0 }}>{i + 1}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>{ex.name}</p>
              <p style={{ fontSize:12, color:'var(--text-mid)', margin:'2px 0 0' }}>{exoLine(ex)}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flexShrink:0, padding:'12px 16px', borderTop:'1px solid var(--border)', paddingBottom:'max(env(safe-area-inset-bottom), 12px)' }}>
        <button onClick={beginSession} style={{ width:'100%', padding:'15px', borderRadius:14, background:`linear-gradient(135deg, ${accent}, #5b6fff)`, border:'none', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer' }}>
          {t('record.workoutStartTraining')}
        </button>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(started ? content : recap, document.body)
}
