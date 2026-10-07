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
import WorkoutEditor from './workout/WorkoutEditor'
import type { WorkoutExercise } from '@/types/workout'
import { vibrateBlockChange, vibrateSessionEnd } from './blockVibrate'
import { buildBoxeTimeline, buildWorkoutBoxeTimeline, totalBoxeRounds, type BoxeSession, type BoxeStep, type LiveIntensity } from './boxe/buildBoxeTimeline'
import { sumComposedMinutes, moveDef, composedMoveLabel, type ComposedSport } from '@/components/planning/composedSports'
import { estimateDurationSec, buildTimeline as buildWorkoutSteps } from './live/buildTimeline'
import { saveWorkout } from './live/saveWorkout'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  rkScope, RkFab, RkIco, RK_ICON, RkBigButton, RkControlRow, RkPausePills, RkCta, RkSheet, RkGroup, RkRow,
  RkSectionLabel, RkPageDots, RkGrid, RkCell, RK_SPRING, PauseGlyph, PlayGlyph,
} from './kit/RecordKit'

interface Props { session: BoxeSession; onClose: () => void; isDark: boolean }

// Panneau de phase (maquette r4) : effort = couleur du sport, préparation =
// ambre, repos = vert. Couleurs fonctionnelles (phases), texte blanc dessus.
const C_PREP = '#f59e0b' // design-allow-color — phase « préparation » (ambre)
const C_REST = 'var(--success)'

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
  // Muscu / Hyrox : blocs ÉDITABLES en direct (réordonner, tours, ajouter…),
  // initialisés depuis la séance. La timeline en dérive. La boxe (non-workout)
  // ne touche jamais à cet état : elle reste pilotée par `session`.
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutExercise[]>(session.workoutBlocks ?? [])
  const timeline = useMemo(() => isWorkout ? buildWorkoutBoxeTimeline(workoutBlocks) : buildBoxeTimeline(session), [session, isWorkout, workoutBlocks])
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
  const [showEditor, setShowEditor] = useState(false)
  const hr = useHeartRate()
  const reduce = useReducedMotion()
  // « Terminer sans enregistrer » en deux temps (évite une perte accidentelle).
  const [discardArmed, setDiscardArmed] = useState(false)
  const discardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armDiscard = () => {
    if (!discardArmed) { haptic('medium'); setDiscardArmed(true); discardTimer.current = setTimeout(() => setDiscardArmed(false), 3000); return }
    if (discardTimer.current) clearTimeout(discardTimer.current)
    haptic('heavy'); onClose()
  }
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
        sport: sportType, startedAt, durationSec: elapsed, exercises: workoutBlocks,
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

  // Applique les blocs édités (WorkoutEditor) : la timeline se reconstruit via
  // useMemo ; on recale la position courante en la bornant à la nouvelle
  // longueur (clamp si dépassement) et on ré-arme le pas de temps + les repères
  // voix uniquement si l'étape courante change (édition d'un AUTRE bloc = aucune
  // interruption de l'exo en cours). Chrono et enregistrement continuent.
  function applyWorkoutEdit(next: WorkoutExercise[]) {
    const nextTimeline = buildWorkoutBoxeTimeline(next)
    const clamped = Math.max(0, Math.min(idx, nextTimeline.length - 1))
    setWorkoutBlocks(next)
    if (clamped !== idx) {
      const step = nextTimeline[clamped]
      if (step) setRemaining(step.durationSec)
      prevIdxRef.current = clamped
      cueKeyRef.current = ''
      setIdx(clamped)
    }
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
              accent={WORK_COLOR(sportType)} isDark={isDark} onNext={() => setSaveStep('form')} onClose={() => { setShowSave(false); setSaveStep('summary') }} />
          : <SessionSaveForm sport={sportType} startedAt={startedAt} onBack={() => setSaveStep('summary')} onSave={handleSave} isDark={isDark}
              summary={{ exos: doneLog.length, sets: setsDone, volumeKg, durationSec: elapsed }}
              hr={{ avg: hr.avg, min: hr.min, max: hr.max }} />}
      </div>,
      document.body,
    )
  }

  const panelColor = phaseColorOf(cur.phase, sportType)
  const phaseName = cur.phase === 'prepare' ? t('rec.phasePrepare') : cur.phase === 'rest' ? t('rec.phaseRest') : cur.phase === 'done' ? t('rec.phaseDone') : t('rec.phaseWork')
  const eyebrow = [phaseName, cur.circuitName, cur.tours && cur.tours > 1 ? `${cur.tour}/${cur.tours}` : null].filter(Boolean).join(' · ')
  const stepProgress = cur.measure === 'time' && cur.durationSec > 0 ? Math.max(0, Math.min(1, 1 - remaining / cur.durationSec)) : 0
  // « À suivre » : les 3 prochaines étapes (effort / repos), hors fin.
  const upcoming = timeline.slice(idx + 1).filter(s => s.phase !== 'done' && s.phase !== 'prepare').slice(0, 3)
  const remainingSteps = timeline.slice(idx + 1).filter(s => s.phase === 'work').length
  const blockNow = Math.min(timeline.filter(s => s.phase === 'work').length, exosDone + (cur.phase === 'work' ? 1 : 0))
  const subtitle = useRounds ? `${t('rec.roundLabel')} ${Math.min(totalCount, roundsDone + (cur.isRound ? 1 : 0))} / ${totalCount}` : `${t('rec.blockLabel')} ${blockNow} / ${totalExos}`

  // ── Panneau « données » (mobile page 2 + colonne droite desktop) ──
  const dataPanel = (
    <div style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rk-card">
        <RkGrid>
          <RkCell label="Temps total" value={fmtDur(elapsed)} size={30} />
          <RkCell label={useRounds ? 'Rounds faits' : 'Exos faits'} value={`${doneCount}/${totalCount}`} size={30} />
          <RkCell label="Séries" value={String(setsDone)} size={30} />
          <RkCell label="Volume" value={volumeKg > 0 ? String(Math.round(volumeKg)) : '—'} unit={volumeKg > 0 ? 'kg' : undefined} size={30} />
          <RkCell label="Calories (est.)" value={String(caloriesEst)} unit="kcal" size={30} />
          <RkCell label="FC moyenne" value={hr.avg ? String(hr.avg) : '—'} unit={hr.avg ? 'bpm' : undefined} size={30} />
          <RkCell label="FC max" value={hr.max ? String(hr.max) : '—'} unit={hr.max ? 'bpm' : undefined} size={30} />
          <RkCell label="Circuit" value={cur.circuitName || (cur.circuitIdx >= 0 ? `#${cur.circuitIdx + 1}` : '—')} size={22} />
        </RkGrid>
      </div>
      <div style={{ margin: '0 -16px' }}><HeartRatePanel hr={hr} accent="var(--danger)" /></div>
    </div>
  )

  // ── Panneau de phase (exercice, cible, décompte, progression) ──
  const phasePanel = (
    <motion.div className="rk-phase" layout transition={{ layout: RK_SPRING }}
      style={{ backgroundColor: panelColor }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.88 }}>{eyebrow}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={idx}
          initial={{ opacity: 0, x: reduce ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -28 }}
          transition={reduce ? { duration: 0.12 } : { ...RK_SPRING, opacity: { duration: 0.18 } }}>
          <div style={{ fontSize: cur.label.length > 16 ? 32 : 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08, marginTop: 6 }}>{cur.label}</div>
          {cur.detail && <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.92, marginTop: 4 }}>{cur.detail}</div>}
        </motion.div>
      </AnimatePresence>

      {cur.label === 'Séance libre' ? (
        <div className="rk-num" style={{ fontSize: 'min(24vw, 96px)', fontWeight: 800, lineHeight: 1, marginTop: 14 }}>{fmtDur(elapsed)}</div>
      ) : cur.measure === 'time' ? (
        <>
          <div className="rk-num" style={{ fontSize: 'min(24vw, 96px)', fontWeight: 800, lineHeight: 1, marginTop: 14 }}>{isDone ? '00:00' : fmt(remaining)}</div>
          {/* Cible cardio (watts / vitesse / allure) — réglable en direct. */}
          {!isDone && cur.phase === 'work' && liveInt && (() => {
            const d = intensityDisplay(liveInt, runUnit)
            return (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <PanelBtn label="−" onClick={() => setLiveInt(v => v ? adjustIntensity(v, -1, runUnit) : v)} />
                <button type="button" onClick={() => setEditInt(true)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 5, padding: 0 }}>
                  <span className="rk-num" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{d.value}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, opacity: 0.9 }}>{d.unit}</span>
                </button>
                <PanelBtn label="+" onClick={() => setLiveInt(v => v ? adjustIntensity(v, 1, runUnit) : v)} />
                {/* Course : bascule km/h ↔ min/km */}
                {liveInt.kind === 'speed' && (
                  <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', background: 'color-mix(in srgb, var(--on-primary) 20%, transparent)' }}>
                    {(['kmh', 'minkm'] as const).map(u => (
                      <button key={u} type="button" onClick={() => setRunUnit(u)} style={{ minHeight: 32, padding: '0 12px', fontSize: 13, fontWeight: 800, border: 'none', borderRadius: 'var(--r-pill)', cursor: 'pointer', background: runUnit === u ? 'var(--on-primary)' : 'transparent', color: runUnit === u ? panelColor : 'var(--on-primary)' }}>{u === 'kmh' ? 'km/h' : 'min/km'}</button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
          {/* Progression de l'étape */}
          {!isDone && (
            <div className="rk-phase-bar" style={{ marginTop: 16 }}>
              <i style={{ transform: `scaleX(${stepProgress})` }} />
            </div>
          )}
          {/* Réglage live du temps : effort ±10 s, récup ±15 s · étape précédente. */}
          {!isDone && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <PanelChip onClick={() => { haptic('light'); goBack() }} disabled={idx === 0}>‹ {t('rec.previous')}</PanelChip>
              <PanelChip onClick={() => adjustTime(cur.phase === 'rest' ? -15 : -10)}>{cur.phase === 'rest' ? '−15 s' : '−10 s'}</PanelChip>
              <PanelChip onClick={() => adjustTime(cur.phase === 'rest' ? 15 : 10)}>{cur.phase === 'rest' ? '+15 s' : '+10 s'}</PanelChip>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Édition live : reps + charge (comme la muscu). */}
          <div style={{ display: 'flex', gap: 22, marginTop: 16, flexWrap: 'wrap' }}>
            <Stepper label="REPS" value={String(liveReps)} onDec={() => setLiveReps(n => Math.max(0, n - 1))} onInc={() => setLiveReps(n => n + 1)} />
            <Stepper label="CHARGE (KG)" value={liveKg === 0 ? 'PDC' : String(liveKg)} onDec={() => setLiveKg(n => Math.max(0, +(n - 2.5).toFixed(1)))} onInc={() => setLiveKg(n => +(n + 2.5).toFixed(1))} />
          </div>
          {!isDone && (
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <PanelChip onClick={() => { haptic('light'); goBack() }} disabled={idx === 0}>‹ {t('rec.previous')}</PanelChip>
              <button type="button" onClick={() => { haptic('medium'); completeReps() }} className="rk-press"
                style={{ minHeight: 48, padding: '0 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--on-primary)', color: panelColor, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                {t('rec.validateNext')} →
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )

  // ── Écran chrono : panneau + tuiles cardio/temps + « À suivre » ──
  const timerPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 16px 16px' }}>
      {phasePanel}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Tile label={t('rec.cardio')} value={hr.status === 'connected' && hr.bpm != null ? String(hr.bpm) : '—'} unit={hr.status === 'connected' && hr.bpm != null ? 'bpm' : undefined} dot={hr.status === 'connected' ? 'var(--danger)' : undefined} />
        <Tile label={t('rec.totalTime')} value={fmtDur(elapsed)} />
      </div>
      {!isDone && upcoming.length > 0 && (
        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '16px 16px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{t('rec.upNext')}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{t('rec.remainingN', { n: remainingSteps })}</span>
          </div>
          <AnimatePresence initial={false}>
            {upcoming.map((s, i) => (
              <motion.div key={`${idx + 1 + i}-${s.label}`} layout
                initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={reduce ? { duration: 0.1 } : { ...RK_SPRING, opacity: { duration: 0.2 } }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span className="rk-dot" style={{ width: 10, height: 10, background: phaseColorOf(s.phase, sportType) }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  {(s.detail || s.measure === 'time') && (
                    <span style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[s.detail, s.measure === 'time' && s.durationSec > 0 ? fmt(s.durationSec) : null].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {isDone && (
        <RkCta variant="primary" onClick={() => { setSaveStep('summary'); setShowSave(true) }}>{t('rec.seeSummary')} →</RkCta>
      )}
    </div>
  )

  // ── Contrôles bas : son · pause/lecture · passer ──
  const paused = !running && !isDone && elapsed > 0
  const controls = isDone ? null : paused ? (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <RkPausePills resumeLabel={t('w2c.resume')} finishLabel={t('rec.finish')} onResume={() => setRunning(true)} onFinish={() => { setSaveStep('summary'); setShowSave(true) }} />
      <div style={{ padding: '0 16px' }}>
        <RkCta variant={discardArmed ? 'danger' : 'text-danger'} onClick={armDiscard}>{discardArmed ? t('rec.confirmDiscard') : t('rec.finishNoSave')}</RkCta>
      </div>
    </div>
  ) : (
    <RkControlRow
      left={<RkFab label={muted ? 'Activer le son' : 'Couper le son'} size={56} onClick={() => { if (muted) voice.unlock(); setMuted(m => !m) }}>
        <RkIco d={muted ? <><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="m23 9-6 6M17 9l6 6" /></> : RK_ICON.mic} size={22} />
      </RkFab>}
      center={<RkBigButton label={running ? t('w2c.pause') : t('w2c.resume')} onClick={() => setRunning(r => !r)}>
        {running ? <PauseGlyph /> : <PlayGlyph />}
      </RkBigButton>}
      right={<RkFab label={cur.phase === 'rest' ? 'Passer le repos' : 'Passer'} size={56} onClick={() => { haptic('light'); advance() }}>
        <RkIco d={RK_ICON.skip} size={22} />
      </RkFab>}
    />
  )

  const header = (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
      <RkFab label={t('w2c.close')} onClick={handleClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[sportLabelOf(sportType), session.title].filter(Boolean).join(' · ')}
        </div>
        {started && <div className="rk-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', marginTop: 1, letterSpacing: 0 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isWorkout && (
          <RkFab label={t('record.editorTitle')} onClick={() => { haptic('light'); setShowEditor(true) }}><RkIco d={RK_ICON.edit} size={19} /></RkFab>
        )}
        <RkFab label="Vue d'ensemble" onClick={() => setShowOverview(true)}><RkIco d={RK_ICON.sliders} size={19} /></RkFab>
      </div>
    </div>
  )

  // ── Résumé pré-séance MUSCU / HYROX (WorkoutExercise[]) ──
  const wBlocks = workoutBlocks
  const preStartWorkout = (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 24px' }}>
      <div className="rk-fade-up" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '4px 4px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{t('record.readyToStart')}</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 0' }}>{session.title}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Tile label="Durée est." value={`~${Math.round(estimateDurationSec(buildWorkoutSteps(wBlocks)) / 60)}`} unit="min" />
          <Tile label="Blocs" value={String(wBlocks.length)} />
        </div>
        <RkGroup>
          {wBlocks.map((b, i) => {
            const isCircuit = b.mode === 'circuit'
            const line = isCircuit
              ? `${b.circuitRounds ?? 1} tour${(b.circuitRounds ?? 1) > 1 ? 's' : ''} · ${(b.circuitExercises ?? []).length} exos`
              : b.durationSec ? `${b.sets} × ${b.durationSec}s` : `${b.sets} × ${b.reps}${b.weightKg ? ` · ${b.weightKg} kg` : ''}`
            return (
              <RkRow key={b.id || i}
                icon={<span className="rk-tile rk-num" style={{ background: 'var(--surface-chip)', fontSize: 15, fontWeight: 800, letterSpacing: 0 }}>{i + 1}</span>}
                label={isCircuit ? (b.name || `Circuit ${i + 1}`) : b.name} sub={line} />
            )
          })}
        </RkGroup>
      </div>
    </div>
  )

  // ── Résumé pré-séance (boxe / hybride) : titre + durée/tours/exos + détail ──
  const preCircuits = session.circuits.length ? session.circuits : [{ id: 'c1', rounds: 1, restSec: 0 }]
  const preFirstId = preCircuits[0].id
  const preDurMin = sumComposedMinutes(session.moves, session.circuits)
  const preTours = preCircuits.reduce((s, c) => s + Math.max(1, c.rounds), 0)
  const preStart = (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 24px' }}>
      <div className="rk-fade-up" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '4px 4px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{t('record.readyToStart')}</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 0' }}>{session.title}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Tile label="Durée est." value={`~${preDurMin}`} unit="min" />
          <Tile label="Tours" value={String(preTours)} />
          <Tile label="Exos" value={String(session.moves.length)} />
        </div>
        {preCircuits.map((c, ci) => {
          const cm = session.moves.filter(m => (m.circuitId ?? preFirstId) === c.id)
          if (!cm.length) return null
          return (
            <div key={c.id}>
              <RkSectionLabel>{c.name || `Circuit ${ci + 1}`} · {Math.max(1, c.rounds)} tour{c.rounds > 1 ? 's' : ''}</RkSectionLabel>
              <RkGroup>
                {cm.map(m => {
                  const def = moveDef(sport as ComposedSport, m.kind)
                  const detail = m.kind === 'round' ? `${m.rounds ?? 1} × ${Math.round((m.timeSec ?? 0) / 60)} min`
                    : m.measure === 'reps' && !m.timeSec ? `${m.reps ?? ''} reps${m.weightKg ? ` · ${m.weightKg} kg` : ''}`
                    : m.timeSec ? `${Math.round(m.timeSec / 60)} min` : ''
                  return <RkRow key={m.id} label={composedMoveLabel(m, def)} value={detail} />
                })}
              </RkGroup>
            </div>
          )
        })}
      </div>
    </div>
  )

  const content = (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {header}
      {!started ? (<>
        {isWorkout ? preStartWorkout : preStart}
        <div style={{ flexShrink: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <RkCta variant="primary" onClick={() => { haptic('heavy'); voice.unlock(); setStarted(true); setRunning(true) }}>{t('rec.beginSession')}</RkCta>
          </div>
        </div>
      </>) : isDesktop ? (
        // Desktop : split gauche (séance/chrono) / droite (données)
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.4fr 1fr' }}>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{timerPanel}</div>
            <div style={{ flexShrink: 0, padding: '8px 0 20px', display: 'flex', justifyContent: 'center' }}>{controls}</div>
          </div>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{dataPanel}</div>
        </div>
      ) : (
        // Mobile : pager horizontal à élan (chrono / données) + points + contrôles
        <>
          <div ref={pagesRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', overflowY: 'auto' }}>{timerPanel}</div>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', overflowY: 'auto' }}>{dataPanel}</div>
          </div>
          <RkPageDots count={2} index={page} onSelect={i => { const el = pagesRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }) }} style={{ padding: '6px 0 2px', flexShrink: 0 }} />
          <div style={{ flexShrink: 0, padding: '10px 0 calc(20px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', minHeight: 116 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={paused ? 'p' : 'r'} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : 10 }}
                transition={reduce ? { duration: 0.1 } : { ...RK_SPRING, opacity: { duration: 0.16 } }}>
                {controls}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Gros décompte flash « 3 / 2 / 1 / GO / STOP » plein écran. */}
      <AnimatePresence>
        {flash && (
          <motion.div key="flash-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--scrim)' }}>
            <motion.span key={flash} className="rk-num"
              initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={reduce ? { duration: 0.1 } : { type: 'spring', stiffness: 520, damping: 22 }}
              style={{ fontSize: flash.length > 2 ? 'min(34vw, 200px)' : 'min(58vw, 340px)', fontWeight: 800, color: 'var(--on-primary)', lineHeight: 1 }}>
              {flash}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <OverviewSheet timeline={timeline} idx={idx} open={showOverview} onClose={() => setShowOverview(false)} isDark={isDark} sportType={sportType} />

      {/* Éditeur de séance en direct (muscu / hyrox uniquement). */}
      {isWorkout && showEditor && (
        <WorkoutEditor
          open={showEditor}
          sport={sportType === 'hyrox' ? 'hyrox' : 'gym'}
          exercises={workoutBlocks}
          accent={WORK_COLOR(sportType)}
          isDark={isDark}
          onClose={() => setShowEditor(false)}
          onApply={applyWorkoutEdit}
        />
      )}

      {/* Saisie manuelle de la cible cardio (valeur exacte). */}
      {editInt && liveInt && (
        <IntensityEditor intensity={liveInt} runUnit={runUnit} isDark={isDark}
          onCancel={() => setEditInt(false)}
          onSubmit={(next) => { setLiveInt(next); setEditInt(false) }} />
      )}

      <RkSheet open={confirmClose} onClose={() => setConfirmClose(false)} isDark={isDark} zIndex={10070} label="Quitter la séance ?">
        <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Quitter la séance ?</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '8px 0 22px' }}>La séance en cours ne sera pas enregistrée.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RkCta variant="primary" onClick={() => setConfirmClose(false)}>Annuler</RkCta>
            <RkCta variant="text-danger" onClick={() => { haptic('heavy'); onClose() }}>Quitter</RkCta>
          </div>
        </div>
      </RkSheet>
    </div>
  )

  return createPortal(content, document.body)
}

// Couleur du panneau selon la phase (maquette r4) : effort = couleur sport,
// repos = vert, préparation = ambre, fin = encre.
function WORK_COLOR(sportType: string): string {
  return sportType === 'hyrox' || sportType === 'hybrid' ? 'var(--sport-hyrox)' : 'var(--sport-gym)'
}
function phaseColorOf(p: BoxeStep['phase'], sportType: string): string {
  if (p === 'prepare') return C_PREP
  if (p === 'rest') return C_REST
  if (p === 'done') return 'var(--text)'
  return WORK_COLOR(sportType)
}
function sportLabelOf(s: string): string {
  return s === 'gym' ? 'Musculation' : s === 'hyrox' ? 'Hyrox' : s === 'hybrid' ? 'Hybrid' : 'Boxe'
}

// Tuile blanche (cardio / temps total / stats pré-séance).
function Tile({ label, value, unit, dot }: { label: string; value: string; unit?: string; dot?: string }) {
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>
        {dot && <span className="rk-dot" data-live="1" style={{ background: dot }} />}{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span className="rk-num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05 }}>{value}</span>
        {unit && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{unit}</span>}
      </div>
    </div>
  )
}

// Bouton rond −/+ posé sur le panneau de phase coloré.
function PanelBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={() => { haptic('light'); onClick() }} className="rk-press"
      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'color-mix(in srgb, var(--on-primary) 22%, transparent)', color: 'var(--on-primary)', fontSize: 24, fontWeight: 800, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {label}
    </button>
  )
}

// Puce (réglage temps / précédent) posée sur le panneau de phase coloré.
function PanelChip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rk-press"
      style={{ minHeight: 40, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'color-mix(in srgb, var(--on-primary) 22%, transparent)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      {children}
    </button>
  )
}

// Stepper reps/charge (sur panneau coloré) — édition live −/+.
function Stepper({ label, value, onDec, onInc }: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', opacity: 0.88, margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PanelBtn label="−" onClick={onDec} />
        <span className="rk-num" style={{ minWidth: 62, textAlign: 'center', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        <PanelBtn label="+" onClick={onInc} />
      </div>
    </div>
  )
}

// Saisie manuelle de la cible exacte (watts, km/h, allure mm:ss).
function IntensityEditor({ intensity, runUnit, onCancel, onSubmit, isDark }: { intensity: LiveIntensity; runUnit: 'kmh' | 'minkm'; onCancel: () => void; onSubmit: (next: LiveIntensity) => void; isDark: boolean }) {
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
  return (
    <RkSheet open onClose={onCancel} title="Cible exacte" sub={isPace ? 'Format mm:ss' : `En ${disp.unit}`} isDark={isDark} zIndex={10010}
      footer={<RkCta variant="primary" onClick={submit}>Valider</RkCta>}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }}
        inputMode={isPace ? 'text' : 'decimal'} placeholder={disp.value} className="rk-field rk-num"
        style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', minHeight: 64 }} />
    </RkSheet>
  )
}

// Vue d'ensemble : toutes les étapes d'EFFORT groupées Fait / En cours / À venir.
function OverviewSheet({ timeline, idx, open, onClose, isDark, sportType }: { timeline: BoxeStep[]; idx: number; open: boolean; onClose: () => void; isDark: boolean; sportType: string }) {
  const { t } = useI18n()
  const efforts = timeline.map((s, i) => ({ s, i })).filter(x => x.s.phase === 'work')
  return (
    <RkSheet open={open} onClose={onClose} title={t('boxe.fullSession')} isDark={isDark} zIndex={10006} full>
      <RkGroup>
        {efforts.map(({ s, i }) => {
          const state = i < idx ? 'done' : i === idx ? 'now' : 'todo'
          return (
            <div key={i} className="rk-row" style={{ opacity: state === 'done' ? 0.5 : 1, background: state === 'now' ? 'color-mix(in srgb, var(--text) 6%, transparent)' : undefined }}>
              <span className="rk-dot" data-live={state === 'now' ? '1' : undefined} style={{ width: 10, height: 10, background: state === 'done' ? 'var(--text-dim)' : state === 'now' ? WORK_COLOR(sportType) : 'var(--surface-bar)' }} />
              <span className="rk-row-t">
                <b>{s.label}{s.tours && s.tours > 1 ? ` · tour ${s.tour}/${s.tours}` : ''}</b>
                {s.detail && <span>{s.detail}</span>}
              </span>
              <span className="rk-row-v rk-num" style={{ letterSpacing: 0 }}>{s.measure === 'time' ? fmt(s.durationSec) : s.reps ? `×${s.reps}` : ''}</span>
            </div>
          )
        })}
      </RkGroup>
    </RkSheet>
  )
}
