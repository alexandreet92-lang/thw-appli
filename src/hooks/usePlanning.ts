'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Calcule le lundi de la semaine courante
function getWeekStart(): string {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  return monday.toISOString().split('T')[0]
}

export interface PlannedSession {
  id:              string
  day_index:       number
  sport:           string
  title:           string
  time:            string
  duration_min:    number
  tss?:            number
  status:          'planned' | 'done'
  intensity:       string
  notes?:          string
  rpe?:            number
  blocks:          any[]
  validation_data: Record<string, any>
}

export interface WeekTask {
  id:          string
  title:       string
  type:        'sport' | 'work' | 'personal' | 'recovery'
  day_index:   number
  start_hour:  number
  start_min:   number
  duration_min:number
  description?: string
  priority:    boolean
}

export interface PlannedRace {
  id:             string
  name:           string
  sport:          string
  date:           string
  level:          'secondary' | 'important' | 'main' | 'gty'
  goal?:          string
  strategy?:      string
  run_distance?:  string
  tri_distance?:  string
  hyrox_category?:string
  hyrox_level?:   string
  hyrox_gender?:  string
  goal_time?:     string
  goal_swim_time?:string
  goal_bike_time?:string
  goal_run_time?: string
  validated:      boolean
  validation_data:Record<string, any>
}

export interface DayIntensityMap {
  [dayIndex: number]: 'recovery' | 'low' | 'mid' | 'hard'
}

export function usePlanning() {
  const supabase   = createClient()
  const weekStart  = getWeekStart()

  const [sessions,   setSessions]   = useState<PlannedSession[]>([])
  const [tasks,      setTasks]      = useState<WeekTask[]>([])
  const [races,      setRaces]      = useState<PlannedRace[]>([])
  const [intensities,setIntensities]= useState<DayIntensityMap>({})
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [s, t, r, di] = await Promise.all([
      supabase.from('planned_sessions').select('*').eq('user_id', user.id).eq('week_start', weekStart),
      supabase.from('week_tasks').select('*').eq('user_id', user.id).eq('week_start', weekStart),
      supabase.from('planned_races').select('*').eq('user_id', user.id).order('date'),
      supabase.from('day_intensity').select('*').eq('user_id', user.id).eq('week_start', weekStart),
    ])

    setSessions((s.data ?? []).map(row => ({
      id: row.id, day_index: row.day_index, sport: row.sport,
      title: row.title, time: row.time ?? '09:00',
      duration_min: row.duration_min, tss: row.tss,
      status: row.status, intensity: row.intensity,
      notes: row.notes, rpe: row.rpe,
      blocks: row.blocks ?? [], validation_data: row.validation_data ?? {},
    })))

    setTasks((t.data ?? []).map(row => ({
      id: row.id, title: row.title, type: row.type,
      day_index: row.day_index, start_hour: row.start_hour,
      start_min: row.start_min ?? 0, duration_min: row.duration_min,
      description: row.description, priority: row.priority ?? false,
    })))

    setRaces((r.data ?? []).map(row => ({
      id: row.id, name: row.name, sport: row.sport,
      date: row.date, level: row.level, goal: row.goal,
      strategy: row.strategy, run_distance: row.run_distance,
      tri_distance: row.tri_distance, hyrox_category: row.hyrox_category,
      hyrox_level: row.hyrox_level, hyrox_gender: row.hyrox_gender,
      goal_time: row.goal_time, goal_swim_time: row.goal_swim_time,
      goal_bike_time: row.goal_bike_time, goal_run_time: row.goal_run_time,
      validated: row.validated ?? false, validation_data: row.validation_data ?? {},
    })))

    const map: DayIntensityMap = {}
    ;(di.data ?? []).forEach(row => { map[row.day_index] = row.intensity })
    setIntensities(map)

    setLoading(false)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  // ── Sessions ──────────────────────────────────
  async function addSession(dayIndex: number, session: Omit<PlannedSession, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('planned_sessions').insert({
      user_id: user.id, week_start: weekStart, day_index: dayIndex,
      sport: session.sport, title: session.title, time: session.time,
      duration_min: session.duration_min, tss: session.tss ?? null,
      status: session.status, notes: session.notes ?? null,
      rpe: session.rpe ?? null, blocks: session.blocks ?? [],
      validation_data: session.validation_data ?? {},
    }).select().single()
    if (!error && data) {
      setSessions(p => [...p, { ...session, id: data.id }])
    }
  }

  async function updateSession(id: string, updates: Partial<PlannedSession>) {
    await supabase.from('planned_sessions').update({
      ...updates, updated_at: new Date().toISOString()
    }).eq('id', id)
    setSessions(p => p.map(s => s.id===id ? { ...s, ...updates } : s))
  }

  async function deleteSession(id: string) {
    await supabase.from('planned_sessions').delete().eq('id', id)
    setSessions(p => p.filter(s => s.id !== id))
  }

  async function moveSession(sessionId: string, toDay: number) {
    await supabase.from('planned_sessions').update({
      day_index: toDay, updated_at: new Date().toISOString()
    }).eq('id', sessionId)
    setSessions(p => p.map(s => s.id===sessionId ? { ...s, day_index: toDay } : s))
  }

  // ── Tasks ─────────────────────────────────────
  async function addTask(task: Omit<WeekTask, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('week_tasks').insert({
      user_id: user.id, week_start: weekStart,
      title: task.title, type: task.type, day_index: task.day_index,
      start_hour: task.start_hour, start_min: task.start_min,
      duration_min: task.duration_min, description: task.description ?? null,
      priority: task.priority,
    }).select().single()
    if (!error && data) setTasks(p => [...p, { ...task, id: data.id }])
  }

  async function updateTask(task: WeekTask) {
    await supabase.from('week_tasks').update({
      title: task.title, start_hour: task.start_hour,
      duration_min: task.duration_min, priority: task.priority,
    }).eq('id', task.id)
    setTasks(p => p.map(t => t.id===task.id ? task : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('week_tasks').delete().eq('id', id)
    setTasks(p => p.filter(t => t.id !== id))
  }

  // ── Races ─────────────────────────────────────
  async function addRace(race: Omit<PlannedRace, 'id' | 'validated' | 'validation_data'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('planned_races').insert({
      user_id: user.id, name: race.name, sport: race.sport,
      date: race.date, level: race.level, goal: race.goal ?? null,
      strategy: race.strategy ?? null, run_distance: race.run_distance ?? null,
      tri_distance: race.tri_distance ?? null, hyrox_category: race.hyrox_category ?? null,
      hyrox_level: race.hyrox_level ?? null, hyrox_gender: race.hyrox_gender ?? null,
      goal_time: race.goal_time ?? null, goal_swim_time: race.goal_swim_time ?? null,
      goal_bike_time: race.goal_bike_time ?? null, goal_run_time: race.goal_run_time ?? null,
      validated: false, validation_data: {},
    }).select().single()
    if (!error && data) setRaces(p => [...p, { ...race, id: data.id, validated: false, validation_data: {} }])
  }

  async function updateRace(race: PlannedRace) {
    await supabase.from('planned_races').update({
      name: race.name, sport: race.sport, date: race.date,
      level: race.level, goal: race.goal ?? null,
      strategy: race.strategy ?? null, validated: race.validated,
      validation_data: race.validation_data ?? {},
      updated_at: new Date().toISOString(),
    }).eq('id', race.id)
    setRaces(p => p.map(r => r.id===race.id ? race : r))
  }

  async function deleteRace(id: string) {
    await supabase.from('planned_races').delete().eq('id', id)
    setRaces(p => p.filter(r => r.id !== id))
  }

  // ── Intensity ─────────────────────────────────
  async function setDayIntensity(dayIndex: number, intensity: 'recovery'|'low'|'mid'|'hard') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('day_intensity').upsert({
      user_id: user.id, week_start: weekStart, day_index: dayIndex, intensity,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start,day_index' })
    setIntensities(p => ({ ...p, [dayIndex]: intensity }))
  }

  return {
    sessions, tasks, races, intensities, loading, weekStart,
    addSession, updateSession, deleteSession, moveSession,
    addTask, updateTask, deleteTask,
    addRace, updateRace, deleteRace,
    setDayIntensity, reload: load,
  }
}
