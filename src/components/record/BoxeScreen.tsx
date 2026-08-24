'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeScreen — lecteur EN DIRECT d'une séance de boxe PLANIFIÉE. Déroule la
// timeline (buildBoxeTimeline) : préparation → rounds/exos par circuit → repos →
// terminé. Fond THÈME (blanc jour / noir nuit) ; seul le bloc de phase est coloré.
// • bouton vue d'ensemble en haut à droite (où on en est, ce qu'il reste) ;
// • exo courant + prochain + récup ; • mobile : swipe vers la page données ;
// • desktop : split gauche (séance) / droite (données). Sauvegarde en activité.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n, currentLocale } from '@/lib/i18n'
import { useWorkoutVoice, countWords } from '@/lib/record/useWorkoutVoice'
import { haptic } from '@/lib/haptics'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import SessionSummary, { type TargetSeries } from './SessionSummary'
import { useHeartRate } from '@/lib/record/useHeartRate'
import HeartRatePanel from './workout/HeartRatePanel'
import { vibrateBlockChange, vibrateSessionEnd } from './blockVibrate'
import { buildBoxeTimeline, buildWorkoutBoxeTimeline, totalBoxeRounds, type BoxeSession, type BoxeStep, type LiveIntensity } from './boxe/buildBoxeTimeline'
import { sumComposedMinutes, moveDef, composedMoveLabel, type ComposedSport } from '@/components/planning/composedSports'
import { estimateDurationSec, buildTimeline as buildWorkoutSteps } from './live/buildTimeline'
import { saveWorkout } from './live/saveWorkout'

interface Props { session: BoxeSession; onClose: () => void; isDark: boolean }

// Palette monochrome (demande : pas de rouge, tout en noir). Le bloc d'effort
// est noir ; prépa/repos restent ambre/vert pour distinguer les phases.
const C_PREP = '#f59e0b', C_WORK = '#161616', C_REST = '#22c55e'
const ACCENT = 'var(--text)'            // encre : texte, traits, bordures
const ACCENT_ON = 'var(--bg)'           // texte posé sur un fond ACCENT plein
const tint = (pct: number) => `color-mix(in srgb, var(--text) ${pct}%, transparent)`
const phaseColorOf = (p: BoxeStep['phase']) => p === 'prepare' ? C_PREP : p === 'rest' ? C_REST : C_WORK
// Bouton −/+ blanc (sur bloc de phase coloré) pour la cible cardio.
const intBtn: React.CSSProperties = { width: 42, height: 42, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 22, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }

function fmt(sec: number) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
function fmtDur(sec: number) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : fmt(sec) }
function fmtPace(sec: number) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return `${m}:${String(s).padStart(2, '0')}` }
function parsePace(str: string): number { const [m, s] = str.split(':').map(Number); return (m || 0) * 60 + (s || 0) }

// Affichage d'une cible cardio selon l'unité course choisie.
function intensityDisplay(it: LiveIntensity, runUnit: 'kmh' | 'minkm'): { value: string; unit: string } {
  switch (it.kind) {
    case 'watts': return { value: String(Math.round(it.watts)), unit: 'W' }
    case 'level': return { value: String(it.level), unit: 'niv.' }
    case 'pace500': return { value: fmtPace(it.sec), unit: '/500m' }
    case 'speed': return runUnit === 'kmh'
      ? { value: it.kmh.toFixed(1), unit: 'km/h' }
      : { value: fmtPace(it.kmh > 0 ? 3600 / it.kmh : 0), unit: '/km' }
  }
}
// Réglage −/+ sur l'unité AFFICHÉE. dir=+1 augmente le nombre affiché.
// Vélo : ±5 W. Course km/h : ±0.5. Course min/km & rameur/skierg : ±0.5 min.
function adjustIntensity(it: LiveIntensity, dir: 1 | -1, runUnit: 'kmh' | 'minkm'): LiveIntensity {
  switch (it.kind) {
    case 'watts': return { kind: 'watts', watts: Math.max(0, it.watts + dir * 5) }
    case 'level': return { kind: 'level', level: Math.max(1, it.level + dir) }
    case 'pace500': return { kind: 'pace500', sec: Math.max(30, it.sec + dir * 5) }   // ±0:05/500m
    case 'speed': {
      if (runUnit === 'kmh') return { kind: 'speed', kmh: Math.max(1, +(it.kmh + dir * 0.5).toFixed(1)) }
      const minKm = it.kmh > 0 ? 60 / it.kmh : 6
      return { kind: 'speed', kmh: +(60 / Math.max(2, minKm + dir * 0.5)).toFixed(2) }
    }
  }
}

function useIsDesktop() {
  const [d, setD] = useState(false)
  useEffect(() => { const s = () => setD(window.innerWidth >= 1024); s(); window.addEventListener('resize', s); return () => window.removeEventListener('resize', s) }, [])
  return d
}

export default function BoxeScreen({ session, onClose, isDark }: Props) {
  const { t } = useI18n()
  const sport = session.sport ?? 'boxe'
  const isWorkout = !!session.workoutBlocks   // muscu / hyrox (WorkoutExercise[])
  const sportType = sport === 'hybrid' ? 'hybrid' : sport === 'gym' ? 'gym' : sport === 'hyrox' ? 'hyrox' : 'boxe'
  const timeline = useMemo(() => isWorkout ? buildWorkoutBoxeTimeline(session.workoutBlocks ?? []) : buildBoxeTimeline(session), [session, isWorkout])
  const totalRounds = useMemo(() => totalBoxeRounds(timeline), [timeline])
  const isDesktop = useIsDesktop()

  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState<boolean>(!!session.free)  // résumé pré-séance sauf séance libre
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const [remaining, setRemaining] = useState(timeline[0]?.durationSec ?? 10)
  const [elapsed, setElapsed] = useState(0)
  const [page, setPage] = useState(0)
  const [showOverview, setShowOverview] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [saveStep, setSaveStep] = useState<'summary' | 'form'>('summary')
  const [confirmClose, setConfirmClose] = useState(false)
  const [startedAt] = useState(new Date().toISOString())
  // Édition en direct (comme la muscu) : reps + charge de l'exo courant, et
  // cumuls séries / volume pour le résumé. Réinitialisés à chaque étape aux reps.
  const [liveReps, setLiveReps] = useState(0)
  const [liveKg, setLiveKg] = useState(0)
  const [setsDone, setSetsDone] = useState(0)
  const [volumeKg, setVolumeKg] = useState(0)
  const [doneLog, setDoneLog] = useState<{ label: string; detail?: string }[]>([])  // récap réel
  // Cible cardio réglable en direct (watts / vitesse / allure) + unité course.
  const [liveInt, setLiveInt] = useState<LiveIntensity | null>(null)
  const [runUnit, setRunUnit] = useState<'kmh' | 'minkm'>('minkm')
  const [editInt, setEditInt] = useState(false)
  const hr = useHeartRate()
  // Voix : annonces du décompte + prochain exo (même pipeline que l'IA).
  const [muted, setMuted] = useState<boolean>(() => { try { return localStorage.getItem('thw:workoutMuted') === '1' } catch { return false } })
  const mutedRef = useRef(muted)
  useEffect(() => { mutedRef.current = muted; try { localStorage.setItem('thw:workoutMuted', muted ? '1' : '0') } catch { /* ignore */ } }, [muted])
  const voiceLang: 'fr' | 'en' = currentLocale().toLowerCase().startsWith('en') ? 'en' : 'fr'
  const voice = useWorkoutVoice(voiceLang, mutedRef)
  const halfWord = voiceLang === 'en' ? 'Half' : 'Moitié'
  const nextPrefix = voiceLang === 'en' ? 'Next:' : 'Prochain :'
  const numWords = countWords(voiceLang)          // ['un','deux','trois'] / ['one','two','three']
  const numWord = (n: number) => numWords[n - 1] ?? String(n)
  const prevIdxRef = useRef(0)
  // Gros affichage flash « 3 / 2 / 1 / GO / STOP » au centre pendant le décompte.
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cueKeyRef = useRef<string>('')            // anti-doublon (ne dit pas 2× le même cue)
  const pulse = (label: string, ms = 950) => {
    setFlash(label)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), ms)
  }
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const pagesRef = useRef<HTMLDivElement>(null)

  const cur = timeline[idx] ?? timeline[timeline.length - 1]
  const isDone = cur.phase === 'done'

  // À l'entrée d'une étape aux reps : précharge reps/charge cibles pour l'édition.
  useEffect(() => {
    if (cur.measure === 'reps') { setLiveReps(cur.reps ?? 0); setLiveKg(cur.weightKg ?? 0) }
    setLiveInt(cur.intensity ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])
  const roundsDone = useMemo(() => timeline.slice(0, idx).filter(s => s.isRound).length, [timeline, idx])
  // Compteur adaptatif : ROUNDS pour la boxe (moves « round »), EXOS sinon
  // (hybrid, renfo…). L'hybrid n'a pas de rounds → on montre les exercices.
  const totalExos = useMemo(() => timeline.filter(s => s.phase === 'work').length, [timeline])
  const exosDone = useMemo(() => timeline.slice(0, idx).filter(s => s.phase === 'work').length, [timeline, idx])
  const useRounds = totalRounds > 0
  const unitLabel = useRounds ? 'ROUNDS' : 'EXOS'
  const doneCount = useRounds ? roundsDone : exosDone
  const totalCount = useRounds ? totalRounds : totalExos
  const caloriesEst = Math.round((elapsed / 60) * 9)  // ≈ 9 kcal/min en boxe

  // Courbe des CIBLES d'intensité sur la durée (puissance/allure) — pour le
  // graphique du résumé. Unité = celle du sport dominant de la séance.
  const targetSeries = useMemo<TargetSeries | null>(() => {
    const work = timeline.filter(s => s.phase === 'work' && s.intensity)
    if (!work.length) return null
    const counts: Record<string, number> = {}
    for (const s of work) counts[s.intensity!.kind] = (counts[s.intensity!.kind] ?? 0) + 1
    const kind = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    const unit = kind === 'watts' ? 'W' : kind === 'speed' ? 'km/h' : kind === 'pace500' ? 's/500m' : 'niv.'
    const scalar = (i: LiveIntensity): number => i.kind === 'watts' ? i.watts : i.kind === 'speed' ? i.kmh : i.kind === 'pace500' ? i.sec : i.level
    let tc = 0; const pts: { t: number; v: number }[] = []
    for (const s of timeline) {
      if (s.phase === 'done') break
      const dur = s.durationSec || 0
      const v = (s.phase === 'work' && s.intensity && s.intensity.kind === kind) ? scalar(s.intensity) : 0
      pts.push({ t: tc, v }); tc += dur; pts.push({ t: tc, v })
    }
    return { pts, unit, kind }
  }, [timeline])

  useEffect(() => { setMounted(true) }, [])

  // Voix de fin + ouverture auto du résumé. Séquence EXACTE :
  //   1. « Félicitations, vous avez terminé. » — on attend qu'elle soit FINIE
  //   2. 1 seconde de silence
  //   3. « Voici le résumé de votre séance. » → ouvre le résumé
  const finishFiredRef = useRef(false)
  useEffect(() => {
    const p1 = voiceLang === 'en' ? 'Congratulations, you finished.' : 'Félicitations, vous avez terminé.'
    const p2 = voiceLang === 'en' ? 'Here is your session summary.' : 'Voici le résumé de votre séance.'
    if (!started) { voice.prefetch(p1); voice.prefetch(p2); return }
    if (!isDone || finishFiredRef.current) return
    finishFiredRef.current = true
    let cancelled = false
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    ;(async () => {
      await voice.speakAwait(p1)        // attend la fin de « Félicitations… »
      if (cancelled) return
      await wait(1000)                  // 1 s de silence
      if (cancelled) return
      voice.speak(p2)                   // « Voici le résumé de votre séance. »
      await wait(350)                   // laisse la phrase démarrer avant la transition
      if (cancelled) return
      setSaveStep('summary'); setShowSave(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, started])

  useEffect(() => {
    if (!running) return
    navigator.wakeLock?.request('screen').then(l => { wakeLockRef.current = l }).catch(() => {})
    return () => { wakeLockRef.current?.release().catch(() => {}) }
  }, [running])

  // Chrono total.
  useEffect(() => {
    if (!running || isDone) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [running, isDone])

  // Décompte de l'étape en cours (uniquement les étapes AU TEMPS). Un tick par
  // seconde ; à 0 on passe à l'étape suivante (sans setState imbriqué).
  useEffect(() => {
    if (!running || isDone || cur.measure !== 'time') return
    if (remaining <= 0) { advance(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isDone, cur.measure, remaining, idx])

  function advance() {
    // Enregistre l'étape d'EFFORT que l'on quitte (ce qui a été FAIT), avec les
    // valeurs éditées en direct (reps/charge/temps/intensité).
    const leaving = timeline[idx]
    if (leaving && leaving.phase === 'work' && leaving.label !== 'Séance libre') {
      let detail = ''
      if (leaving.measure === 'reps') detail = `${liveReps} reps${liveKg ? ` · ${liveKg} kg` : ''}`
      else {
        const done = Math.max(0, (leaving.durationSec || 0) - Math.max(0, remaining))
        detail = fmt(done > 0 ? done : (leaving.durationSec || 0))
        if (liveInt) { const d = intensityDisplay(liveInt, runUnit); detail += ` · ${d.value} ${d.unit}` }
      }
      setDoneLog(log => [...log, { label: leaving.label, detail }])
    }
    setIdx(i => {
      const next = Math.min(i + 1, timeline.length - 1)
      const step = timeline[next]
      if (step) {
        setRemaining(step.durationSec)
        if (step.phase === 'done') { setRunning(false); vibrateSessionEnd() } else vibrateBlockChange()
      }
      return next
    })
  }

  // Valider une étape aux reps : cumule la série + le volume (reps × charge)
  // avec les valeurs ÉDITÉES en direct, puis avance.
  function completeReps() {
    setSetsDone(n => n + 1)
    setVolumeKg(v => v + liveReps * liveKg)
    advance()
  }
  // Revenir à l'étape précédente (annuler une avance trop rapide, refaire une série).
  function goBack() {
    setIdx(i => {
      const prev = Math.max(0, i - 1)
      const step = timeline[prev]
      if (step) setRemaining(step.durationSec)
      if (running || isDone) { /* on reste dans l'état courant */ }
      return prev
    })
  }
  // Réglages en direct du temps : effort ±10 s, récup ±15 s (borné ≥ 0).
  const adjustTime = (d: number) => setRemaining(r => Math.max(0, r + d))

  // Libellé du prochain EXO (étape « work ») après l'index i — pour l'annonce.
  const firstWorkAfter = (i: number): string => {
    for (let k = i + 1; k < timeline.length; k++) if (timeline[k].phase === 'work') return timeline[k].label
    return ''
  }

  // ── VOIX 1 : « GO » en entrant sur un exo, « STOP » en quittant un exo au
  // temps, et pré-chargement de l'annonce du prochain exo en entrant en repos.
  useEffect(() => {
    if (!running) { prevIdxRef.current = idx; return }
    if (idx !== prevIdxRef.current) {
      const prev = timeline[prevIdxRef.current]
      const step = timeline[idx]
      if (prev?.phase === 'work' && prev.measure === 'time') { voice.speak('STOP'); pulse('STOP'); haptic('heavy') }
      if (step?.phase === 'work') { voice.speak('GO'); pulse('GO'); haptic('heavy') }
      if (step && (step.phase === 'rest' || step.phase === 'prepare')) {
        const nx = firstWorkAfter(idx); if (nx) voice.prefetch(`${nextPrefix} ${nx}`)
      }
      prevIdxRef.current = idx
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, running])

  // ── VOIX 2 : décompte 3-2-1 (fin d'exo au temps ET avant un nouvel exo),
  // « Moitié/Half » à mi-parcours, annonce du prochain exo à −10 s (repos).
  // Bip + gros chiffre à chaque top ; anti-doublon via cueKeyRef.
  useEffect(() => {
    if (!running || cur.measure !== 'time' || cur.phase === 'done') return
    const countdown = (remaining === 3 || remaining === 2 || remaining === 1)
    const nx = cur.phase === 'work' ? null : firstWorkAfter(idx)
    // Un décompte n'a de sens que s'il mène à un exo (repos/prépa → nx) ou
    // termine un exo chronométré (work).
    const relevant = cur.phase === 'work' || !!nx
    if (countdown && relevant) {
      const key = `${idx}:${remaining}`
      if (cueKeyRef.current !== key) {
        cueKeyRef.current = key
        voice.speak(numWord(remaining))
        pulse(String(remaining))
        haptic('medium')
      }
    }
    if (cur.phase === 'work') {
      const half = Math.floor(cur.durationSec / 2)
      if (cur.durationSec >= 12 && half >= 4 && remaining === half) {
        const key = `${idx}:half`
        if (cueKeyRef.current !== key) { cueKeyRef.current = key; voice.speak(halfWord); pulse(halfWord, 800) }
      }
    } else if (nx && remaining === 10) {
      const key = `${idx}:announce`
      if (cueKeyRef.current !== key) { cueKeyRef.current = key; voice.speak(`${nextPrefix} ${nx}`) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, idx, running])

  const onScroll = () => { const el = pagesRef.current; if (el) setPage(Math.round(el.scrollLeft / el.clientWidth)) }

  const handleClose = () => { if (elapsed > 0) { setConfirmClose(true); return } onClose() }

  const handleSave = async (formData: SessionFormData) => {
    // Muscu / Hyrox : chemin muscu complet (workout_sessions + activities, avec
    // volume/séries) pour ne pas perdre les stats. Boxe/hybride : activités.
    if (isWorkout) {
      await saveWorkout({
        sport: sportType, startedAt, durationSec: elapsed, exercises: session.workoutBlocks ?? [],
        setsCompleted: setsDone, volumeKg, hr: { avg: hr.avg, max: hr.max, min: hr.min }, form: formData,
      })
      onClose()
      return
    }
    const sb = createClient()
    const user = await getCurrentUser()
    if (!user) return
    await sb.from('activities').insert({
      user_id: user.id, sport_type: sportType, title: formData.title,
      started_at: startedAt, moving_time_s: elapsed, elapsed_time_s: elapsed,
      calories: caloriesEst || null,
      avg_hr: hr.avg || null, max_hr: hr.max || null,
      average_heartrate: hr.avg || null, max_heartrate: hr.max || null,
      rpe: formData.rpe, perceived_effort: formData.rpe, feeling: formData.sensation, comment: formData.comment,
      visibility: formData.visibility,
    })
    onClose()
  }

  if (!mounted) return null

  if (showSave) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 10002 }}>
        {saveStep === 'summary'
          ? <SessionSummary sportType={sportType} startedAt={startedAt} durationSec={elapsed}
              doneList={doneLog} sets={setsDone} volumeKg={volumeKg} caloriesEst={caloriesEst}
              doneCount={doneCount} totalCount={totalCount} unitLabel={unitLabel}
              hr={{ avg: hr.avg, max: hr.max, min: hr.min, samples: hr.samples }} target={targetSeries}
              accent={ACCENT} isDark={isDark} onNext={() => setSaveStep('form')} onClose={() => { setShowSave(false); setSaveStep('summary') }} />
          : <SessionSaveForm sport={sportType} startedAt={startedAt} onBack={() => setSaveStep('summary')} onSave={handleSave} isDark={isDark} />}
      </div>,
      document.body,
    )
  }

  // ── Panneau « données » (mobile page 2 + colonne droite desktop) ──
  const dataPanel = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 16, alignContent: 'start' }}>
      <Metric label="Temps total" value={fmtDur(elapsed)} />
      <Metric label={useRounds ? 'Rounds faits' : 'Exos faits'} value={`${doneCount}/${totalCount}`} />
      <Metric label="Séries" value={String(setsDone)} />
      <Metric label="Volume" value={volumeKg > 0 ? String(Math.round(volumeKg)) : '—'} unit={volumeKg > 0 ? 'kg' : ''} />
      <Metric label="Calories (est.)" value={String(caloriesEst)} unit="kcal" />
      <Metric label="FC moyenne" value={hr.avg ? String(hr.avg) : '—'} unit={hr.avg ? 'bpm' : ''} />
      <Metric label="FC max" value={hr.max ? String(hr.max) : '—'} unit={hr.max ? 'bpm' : ''} />
      <Metric label="Circuit" value={cur.circuitName || (cur.circuitIdx >= 0 ? `#${cur.circuitIdx + 1}` : '—')} />
      <div style={{ gridColumn: '1 / -1' }}><HeartRatePanel hr={hr} accent={ACCENT} /></div>
    </div>
  )

  // ── Écran chrono (bloc de phase coloré + prochain + contrôles) ──
  const timerPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Bloc phase géant */}
      <div style={{ flex: 1, minHeight: 0, background: phaseColorOf(cur.phase), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background .3s', padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>{cur.label}</p>
        {cur.detail && <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '4px 0 0' }}>{cur.detail}</p>}
        {cur.label === 'Séance libre' ? (
          <p style={{ fontSize: 'min(26vw, 120px)', fontWeight: 900, color: '#fff', margin: '4px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsed)}</p>
        ) : cur.measure === 'time' ? (
          <>
            <p style={{ fontSize: 'min(24vw, 108px)', fontWeight: 900, color: '#fff', margin: '4px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{isDone ? '00:00' : fmt(remaining)}</p>
            {/* Cible cardio (watts / vitesse / allure) — affichée SOUS le temps, réglable. */}
            {!isDone && cur.phase === 'work' && liveInt && (() => {
              const d = intensityDisplay(liveInt, runUnit)
              return (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setLiveInt(v => v ? adjustIntensity(v, -1, runUnit) : v)} style={intBtn}>−</button>
                    <button onClick={() => setEditInt(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, opacity: 0.9 }}>{d.unit}</span>
                    </button>
                    <button onClick={() => setLiveInt(v => v ? adjustIntensity(v, 1, runUnit) : v)} style={intBtn}>+</button>
                  </div>
                  {/* Course : bascule km/h ↔ min/km */}
                  {liveInt.kind === 'speed' && (
                    <div style={{ display: 'inline-flex', border: '1.5px solid rgba(255,255,255,0.8)', borderRadius: 999, overflow: 'hidden' }}>
                      {(['kmh', 'minkm'] as const).map(u => (
                        <button key={u} onClick={() => setRunUnit(u)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', background: runUnit === u ? '#fff' : 'transparent', color: runUnit === u ? '#000' : '#fff' }}>{u === 'kmh' ? 'km/h' : 'min/km'}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* Réglage live du temps : effort ±10 s, récup ±15 s. */}
            {!isDone && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <WhiteChip onClick={() => adjustTime(cur.phase === 'rest' ? -15 : -10)}>{cur.phase === 'rest' ? '−15 s' : '−10 s'}</WhiteChip>
                <WhiteChip onClick={() => adjustTime(cur.phase === 'rest' ? 15 : 10)}>{cur.phase === 'rest' ? '+15 s' : '+10 s'}</WhiteChip>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Édition live : reps + charge (comme la muscu). */}
            <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Stepper label="REPS" value={String(liveReps)} onDec={() => setLiveReps(n => Math.max(0, n - 1))} onInc={() => setLiveReps(n => n + 1)} />
              <Stepper label="CHARGE (KG)" value={liveKg === 0 ? 'PDC' : String(liveKg)} onDec={() => setLiveKg(n => Math.max(0, +(n - 2.5).toFixed(1)))} onInc={() => setLiveKg(n => +(n + 2.5).toFixed(1))} />
            </div>
            {!isDone && <button onClick={completeReps} style={{ marginTop: 22, padding: '13px 34px', borderRadius: 999, border: '2px solid #fff', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>Valider · Suivant →</button>}
          </>
        )}
      </div>

      {/* Prochain */}
      {!isDone && cur.nextLabel && (
        <div style={{ flexShrink: 0, background: 'var(--bg-card2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>À suivre</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.nextLabel}</span>
        </div>
      )}

      {/* Navigation manuelle : précédent / passer (repos ou exo). */}
      {!isDone && (
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '10px 24px 0', justifyContent: 'center' }}>
          <button onClick={() => { haptic("light"); goBack() }} disabled={idx === 0}
            style={{ flex: 1, maxWidth: 200, padding: '9px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: idx === 0 ? 'var(--text-dim)' : 'var(--text)', fontSize: 13, fontWeight: 800, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Précédent
          </button>
          <button onClick={() => { haptic("light"); advance() }}
            style={{ flex: 1, maxWidth: 200, padding: '9px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {cur.phase === 'rest' ? 'Passer le repos' : 'Passer'}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* Contrôles */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '14px 24px', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 34, fontWeight: 900, color: ACCENT, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, totalCount - doneCount)}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', margin: '4px 0 0', letterSpacing: '0.06em' }}>{unitLabel} RESTANTS</p>
        </div>
        {isDone ? (
          // La voix ouvre automatiquement le résumé ; ce bouton n'est qu'un secours pour le rouvrir.
          <button onClick={() => { setSaveStep('summary'); setShowSave(true) }} style={{ height: 52, padding: '0 22px', borderRadius: 999, border: `2px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap' }}>Voir le résumé →</button>
        ) : (
          <button onClick={() => setRunning(r => !r)} style={{ width: 84, height: 84, borderRadius: '50%', border: `3px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {running ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              : <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totalCount}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', margin: '4px 0 0', letterSpacing: '0.06em' }}>{unitLabel} TOTAL</p>
        </div>
      </div>
    </div>
  )

  const header = (
    <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, borderBottom: '1px solid var(--border)' }}>
      <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title || 'Boxe'}</p>
        {/* FC centrée en haut si un capteur est connecté ; sinon chrono total. */}
        {hr.status === 'connected' && hr.bpm != null ? (
          <p style={{ fontSize: 15, fontWeight: 800, color: ACCENT, margin: '1px 0 0', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={ACCENT}><path d="M12 21s-7.5-4.9-10-9.5C.5 8 2 4.5 5.5 4.5c2 0 3.3 1.1 4.5 2.6 1.2-1.5 2.5-2.6 4.5-2.6C22 4.5 23.5 8 22 11.5 19.5 16.1 12 21 12 21z"/></svg>
            {hr.bpm} <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>bpm</span>
          </p>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsed)}</p>
        )}
      </div>
      {/* Couper / activer le son (à gauche des trois traits). */}
      <button onClick={() => { if (muted) voice.unlock(); setMuted(m => !m) }} aria-label={muted ? 'Activer le son' : 'Couper le son'}
        style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: muted ? 'var(--text-dim)' : 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        )}
      </button>
      <button onClick={() => setShowOverview(true)} aria-label="Vue d'ensemble" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  )

  // ── Résumé pré-séance MUSCU / HYROX (WorkoutExercise[]) ──
  const wBlocks = session.workoutBlocks ?? []
  const preStartWorkout = (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 32px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, fontWeight: 800, margin: '4px 0 6px' }}>Prêt à démarrer</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px' }}>{session.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>~{Math.round(estimateDurationSec(buildWorkoutSteps(wBlocks)) / 60)} min</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Durée est.</div></div>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{wBlocks.length}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Blocs</div></div>
        </div>
        {wBlocks.map((b, i) => {
          const isCircuit = b.mode === 'circuit'
          const line = isCircuit
            ? `${b.circuitRounds ?? 1} tour${(b.circuitRounds ?? 1) > 1 ? 's' : ''} · ${(b.circuitExercises ?? []).length} exos`
            : b.durationSec ? `${b.sets} × ${b.durationSec}s` : `${b.sets} × ${b.reps}${b.weightKg ? ` · ${b.weightKg} kg` : ''}`
          return (
            <div key={b.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 15px', marginBottom: 10 }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{isCircuit ? (b.name || `Circuit ${i + 1}`) : b.name}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-mid)', fontWeight: 600 }}>{line}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Résumé pré-séance (comme la muscu) : titre + durée/tours/exos + détail ──
  const preCircuits = session.circuits.length ? session.circuits : [{ id: 'c1', rounds: 1, restSec: 0 }]
  const preFirstId = preCircuits[0].id
  const preDurMin = sumComposedMinutes(session.moves, session.circuits)
  const preTours = preCircuits.reduce((s, c) => s + Math.max(1, c.rounds), 0)
  const preStart = (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 32px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, fontWeight: 800, margin: '4px 0 6px' }}>Prêt à démarrer</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px' }}>{session.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>~{preDurMin} min</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Durée est.</div></div>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{preTours}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tours</div></div>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{session.moves.length}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Exos</div></div>
        </div>
        {preCircuits.map((c, ci) => {
          const cm = session.moves.filter(m => (m.circuitId ?? preFirstId) === c.id)
          if (!cm.length) return null
          return (
            <div key={c.id} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>{c.name || `Circuit ${ci + 1}`} · {Math.max(1, c.rounds)} tour{c.rounds > 1 ? 's' : ''}</p>
              {cm.map(m => {
                const def = moveDef(sport as ComposedSport, m.kind)
                const detail = m.kind === 'round' ? `${m.rounds ?? 1} × ${Math.round((m.timeSec ?? 0) / 60)} min`
                  : m.measure === 'reps' && !m.timeSec ? `${m.reps ?? ''} reps${m.weightKg ? ` · ${m.weightKg} kg` : ''}`
                  : m.timeSec ? `${Math.round(m.timeSec / 60)} min` : ''
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: 13 }}>#</span>
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{composedMoveLabel(m, def)}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-mid)', fontWeight: 600 }}>{detail}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', paddingTop: 'env(safe-area-inset-top)' }}>
      {header}
      {/* Barre de progression globale de la séance. */}
      {started && (
        <div style={{ flexShrink: 0, height: 3, background: 'var(--border)' }}>
          <div style={{ height: '100%', width: `${Math.round((idx / Math.max(1, timeline.length - 1)) * 100)}%`, background: ACCENT, transition: 'width .35s ease' }} />
        </div>
      )}
      {!started ? (<>
        {isWorkout ? preStartWorkout : preStart}
        <div style={{ flexShrink: 0, padding: '12px 18px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => { voice.unlock(); setStarted(true); setRunning(true) }} style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'block', padding: 15, borderRadius: 14, border: 'none', background: ACCENT, color: ACCENT_ON, fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>Commencer</button>
        </div>
      </>) : isDesktop ? (
        // Desktop : split gauche (séance/chrono) / droite (données)
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.4fr 1fr' }}>
          <div style={{ minHeight: 0, borderRight: '1px solid var(--border)' }}>{timerPanel}</div>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{dataPanel}</div>
        </div>
      ) : (
        // Mobile : pager horizontal (chrono / données) + points
        <>
          <div ref={pagesRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory' }}>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', minHeight: 0 }}>{timerPanel}</div>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', overflowY: 'auto' }}>{dataPanel}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 calc(6px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            {[0, 1].map(i => <span key={i} style={{ height: 6, width: i === page ? 18 : 6, borderRadius: 3, background: i === page ? ACCENT : 'var(--border-mid)', transition: '.2s' }} />)}
          </div>
        </>
      )}

      {/* Gros décompte flash « 3 / 2 / 1 / GO / STOP » plein écran. */}
      {flash && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)' }}>
          <style>{`@keyframes flashPop{0%{transform:scale(.5);opacity:0}30%{transform:scale(1.05);opacity:1}100%{transform:scale(1);opacity:1}}`}</style>
          <span key={flash} style={{ fontSize: flash.length > 2 ? 'min(34vw, 200px)' : 'min(58vw, 340px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 6px 50px rgba(0,0,0,0.5)', animation: 'flashPop .28s cubic-bezier(.2,.9,.3,1)', fontVariantNumeric: 'tabular-nums' }}>{flash}</span>
        </div>
      )}

      {showOverview && <OverviewSheet timeline={timeline} idx={idx} onClose={() => setShowOverview(false)} />}

      {/* Saisie manuelle de la cible cardio (valeur exacte). */}
      {editInt && liveInt && (
        <IntensityEditor intensity={liveInt} runUnit={runUnit}
          onCancel={() => setEditInt(false)}
          onSubmit={(next) => { setLiveInt(next); setEditInt(false) }} />
      )}

      {/* Chrono en pause → 3 choix : Reprendre / Terminer sans enregistrer /
          Terminer et enregistrer. Carte opaque + texte contrasté (lisible). */}
      {!running && !isDone && elapsed > 0 && !showOverview && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 24, width: 'min(360px, 90vw)', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Séance en pause</p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 20px' }}>Temps écoulé · {fmtDur(elapsed)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setRunning(true)} style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: '#22c55e', color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>Reprendre</button>
              <button onClick={() => { setSaveStep('summary'); setShowSave(true) }} style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: ACCENT, color: ACCENT_ON, fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>Terminer et enregistrer</button>
              <button onClick={onClose} style={{ width: '100%', padding: 15, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Terminer sans enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {confirmClose && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 20, width: 'min(320px, 86vw)', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Quitter la séance ?</p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 16px' }}>La séance en cours ne sera pas enregistrée.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: ACCENT, border: 'none', color: ACCENT_ON, fontWeight: 700, cursor: 'pointer' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}

// Puce blanche (réglage temps) posée sur le bloc de phase coloré.
function WhiteChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 18px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{children}</button>
  )
}

// Stepper reps/charge (blanc sur bloc coloré) — édition live −/+.
function Stepper({ label, value, onDec, onInc }: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  const btn: React.CSSProperties = { width: 46, height: 46, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onDec} style={btn}>−</button>
        <span style={{ minWidth: 62, fontSize: 34, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</span>
        <button onClick={onInc} style={btn}>+</button>
      </div>
    </div>
  )
}

// Saisie manuelle de la cible exacte (watts, km/h, allure mm:ss).
function IntensityEditor({ intensity, runUnit, onCancel, onSubmit }: { intensity: LiveIntensity; runUnit: 'kmh' | 'minkm'; onCancel: () => void; onSubmit: (next: LiveIntensity) => void }) {
  const disp = intensityDisplay(intensity, runUnit)
  const [val, setVal] = useState(disp.value)
  const isPace = intensity.kind === 'pace500' || (intensity.kind === 'speed' && runUnit === 'minkm')
  const submit = () => {
    let next: LiveIntensity = intensity
    if (intensity.kind === 'watts') next = { kind: 'watts', watts: Math.max(0, Math.round(parseFloat(val) || 0)) }
    else if (intensity.kind === 'level') next = { kind: 'level', level: Math.max(1, Math.round(parseFloat(val) || 1)) }
    else if (intensity.kind === 'pace500') next = { kind: 'pace500', sec: Math.max(30, parsePace(val)) }
    else if (intensity.kind === 'speed') {
      if (runUnit === 'kmh') next = { kind: 'speed', kmh: Math.max(1, parseFloat(val) || 1) }
      else { const sec = parsePace(val); next = { kind: 'speed', kmh: sec > 0 ? +(3600 / sec).toFixed(2) : intensity.kmh } }
    }
    onSubmit(next)
  }
  return createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 22, width: 'min(320px, 90vw)' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Cible exacte</p>
        <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 14px' }}>{isPace ? 'Format mm:ss' : `En ${disp.unit}`}</p>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }}
          inputMode={isPace ? 'text' : 'decimal'} placeholder={disp.value}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 20, fontWeight: 800, textAlign: 'center', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
          <button onClick={submit} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--text)', border: 'none', color: 'var(--bg)', fontWeight: 800, cursor: 'pointer' }}>Valider</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
        {value}{unit && <small style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 2 }}>{unit}</small>}
      </div>
    </div>
  )
}

// Vue d'ensemble : toutes les étapes d'EFFORT groupées Fait / En cours / À venir.
function OverviewSheet({ timeline, idx, onClose }: { timeline: BoxeStep[]; idx: number; onClose: () => void }) {
  const efforts = timeline.map((s, i) => ({ s, i })).filter(x => x.s.phase === 'work')
  const Row = ({ s, state }: { s: BoxeStep; state: 'done' | 'now' | 'todo' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: state === 'now' ? tint(8) : 'var(--bg-card2)', border: state === 'now' ? `1px solid ${tint(40)}` : '1px solid transparent', opacity: state === 'done' ? 0.5 : 1 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: state === 'done' ? 'var(--text-dim)' : state === 'now' ? ACCENT : 'var(--border-mid)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{s.label}{s.tours && s.tours > 1 ? ` · tour ${s.tour}/${s.tours}` : ''}</span>
        {s.detail && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{s.detail}</span>}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', flexShrink: 0 }}>{s.measure === 'time' ? fmt(s.durationSec) : s.reps ? `×${s.reps}` : ''}</span>
    </div>
  )
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10006, background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Séance complète</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 20px' }}>
          {efforts.map(({ s, i }) => <Row key={i} s={s} state={i < idx ? 'done' : i === idx ? 'now' : 'todo'} />)}
        </div>
      </div>
    </>,
    document.body,
  )
}
