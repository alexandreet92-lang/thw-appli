'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise } from '@/types/workout'
import { DEFAULT_GYM_EXERCISES, DEFAULT_HYROX_EXERCISES } from '@/types/workout'
import type { Block } from '@/app/planning/page'
import { blocksToWorkoutExercises } from '@/components/planning/mobile/strength'
import { useI18n } from '@/lib/i18n'
import { RkSheet, RkSectionLabel, RkGroup, RkRow, RkTile, RkCta, RkIco, RK_ICON } from './kit/RecordKit'

const DAY_KEYS = ['record.workoutDayMon', 'record.workoutDayTue', 'record.workoutDayWed', 'record.workoutDayThu', 'record.workoutDayFri', 'record.workoutDaySat', 'record.workoutDaySun']

function getMondayStr() {
  const now = new Date()
  const d = new Date(now)
  d.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return d.toISOString().split('T')[0]
}

interface PlannedSession {
  id: string
  title: string
  sport: string
  blocks: WorkoutExercise[]
  week_start?: string
  day_index?: number
}

interface Props {
  sport: 'gym' | 'hyrox'
  open: boolean
  onClose: () => void
  onStart: (exercises: WorkoutExercise[], title?: string) => void
  onFreeMode?: (sport: 'gym' | 'hyrox') => void
  isDark: boolean
}

export default function WorkoutLauncher({ sport, open, onClose, onStart, onFreeMode, isDark }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [thisWeek, setThisWeek] = useState<PlannedSession[]>([])
  const [allSessions, setAllSessions] = useState<PlannedSession[]>([])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const label = sport === 'gym' ? t('record.workoutMuscu') : 'Hyrox'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) } }, [])

  useEffect(() => {
    if (!open) return
    const monday = getMondayStr()
    const supabase = createClient()
    supabase.from('planned_sessions')
      .select('id, title, sport, blocks, week_start, day_index')
      .eq('sport', sport)
      .order('day_index', { ascending: true })
      .then(({ data }) => {
        const all = (data ?? []).map(d => ({ ...d, blocks: blocksToWorkoutExercises((d.blocks ?? []) as Block[], sport) }))
        setAllSessions(all)
        setThisWeek(all.filter(s => s.week_start === monday))
      })
  }, [open, sport])

  if (!mounted || !open) return null

  const handleClose = () => { setClosing(true); closeTimerRef.current = setTimeout(onClose, 300) }
  const sportCol = sport === 'gym' ? 'var(--sport-gym)' : 'var(--sport-hyrox)'

  const SessionRow = ({ s }: { s: PlannedSession }) => (
    <RkRow
      icon={<RkTile color={sportCol}><span style={{ fontSize: 13, fontWeight: 800 }}>{s.day_index != null ? t(DAY_KEYS[s.day_index]).slice(0, 3) : '·'}</span></RkTile>}
      label={s.title}
      sub={[s.day_index != null ? t(DAY_KEYS[s.day_index]) : '', s.blocks.length > 0 ? `${s.blocks.length} ${t(s.blocks.length !== 1 ? 'record.workoutExercisesPlural' : 'record.workoutExerciseSingular')}` : ''].filter(Boolean).join(' · ')}
      onClick={() => { handleClose(); onStart(s.blocks, s.title) }} />
  )

  return (
    <RkSheet open={!closing} onClose={handleClose} title={label} isDark={isDark} zIndex={10000}
      footer={
        // NO TRAINING : on NE crée PAS de séance ici, uniquement lancer sans programme.
        <RkCta variant="primary" onClick={() => { handleClose(); onFreeMode ? onFreeMode(sport) : onStart(sport === 'gym' ? DEFAULT_GYM_EXERCISES : DEFAULT_HYROX_EXERCISES) }}>
          <RkIco d={RK_ICON.play} size={18} fill="currentColor" sw={0} />
          {t('record.workoutLaunch')} · {t('record.workoutNoProgram')}
        </RkCta>
      }>
      {/* SECTION 1 — TRAINING PLANNING */}
      <RkSectionLabel>Training Planning</RkSectionLabel>
      {thisWeek.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, padding: '4px 4px 8px' }}>{t('record.workoutNoPlannedSession')}</p>
      ) : (
        <RkGroup>{thisWeek.map(s => <SessionRow key={s.id} s={s} />)}</RkGroup>
      )}

      {/* SECTION 2 — TRAINING SESSION */}
      {allSessions.length > 0 && (
        <>
          <RkSectionLabel>Training Session</RkSectionLabel>
          <RkGroup>{allSessions.map(s => <SessionRow key={s.id} s={s} />)}</RkGroup>
        </>
      )}
      <div style={{ height: 8 }} />
    </RkSheet>
  )
}
