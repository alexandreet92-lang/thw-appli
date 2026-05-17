'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import GoalBanner from './components/GoalBanner'
import NextRaceBar from './components/NextRaceBar'
import AnnualView from './components/AnnualView'
import MonthlyView from './components/MonthlyView'
import RaceModal from './components/RaceModal'
import EventModal from './components/EventModal'
import type { RaceStage, NutritionItem } from './components/types'
import ClockView, { type ClockEvent } from './components/ClockView'

// ── Types ─────────────────────────────────────────
type CalTab        = 'race' | 'pro' | 'perso' | 'all'
type CalView       = 'year' | 'month'
type TimelineMode  = 'vertical' | 'horizontal'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type RaceSport     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing' | 'gym'

interface Race {
  id: string; name: string; sport: RaceSport; date: string; level: RaceLevel
  goal?: string; strategy?: string
  runDistance?: string; triDistance?: string
  hyroxCategory?: string; hyroxLevel?: string; hyroxGender?: string
  goalTime?: string; goalSwimTime?: string; goalBikeTime?: string; goalRunTime?: string
  validated?: boolean; validationData?: Record<string, unknown>
  // Extended fields
  status?: 'upcoming' | 'completed'
  distance?: string
  performanceData?: Record<string, unknown>
  nutritionStrategy?: NutritionItem[]
  notes?: string
}

interface CalEventType {
  id: string; name: string; color: string; category: 'pro' | 'perso'
}

interface CalEvent {
  id: string; category: 'race' | 'pro' | 'perso'
  typeId?: string; date: string; title: string; description?: string; color?: string
}

// Combined event for All view
interface AnyEvent {
  id: string; date: string; title: string
  category: 'race' | 'pro' | 'perso'; color: string; label: string
  subLabel?: string
}

// ── Constants ─────────────────────────────────────
const MONTHS      = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const SPORT_BG: Record<SportType, string> = {
  swim:'rgba(56,189,248,0.13)', run:'rgba(34,197,94,0.13)', bike:'rgba(59,130,246,0.13)',
  hyrox:'rgba(239,68,68,0.13)', gym:'rgba(249,115,22,0.13)',
  triathlon:'rgba(168,85,247,0.13)', rowing:'rgba(20,184,166,0.13)',
}
const SPORT_BORDER: Record<SportType, string> = {
  swim:'#38bdf8', run:'#22c55e', bike:'#3b82f6',
  hyrox:'#ef4444', gym:'#f97316', triathlon:'#a855f7', rowing:'#14b8a6',
}

const RACE_CONFIG: Record<RaceLevel, { label: string; color: string; bg: string; border: string }> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444' },
  gty:       { label:'GTY', color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)' },
}

const EVENT_CONFIG = { label:'Événement', color:'#9ca3af', bg:'rgba(156,163,175,0.12)', border:'#9ca3af' }

const CATEGORY_CONFIG = {
  race:  { label:'Race',  color:'#ef4444', bg:'rgba(239,68,68,0.10)'  },
  pro:   { label:'Pro',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)' },
  perso: { label:'Perso', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
}

const RUN_DISTANCES = ['5 km','10 km','Semi-marathon','Marathon']
const RUN_KM: Record<string, number> = { '5 km':5,'10 km':10,'Semi-marathon':21.1,'Marathon':42.195 }
const TRI_DISTANCES = ['XS (Super Sprint)','S (Sprint)','M (Standard)','L / 70.3','XL / Ironman']
const TRI_SWIM: Record<string, string> = { 'XS (Super Sprint)':'300m','S (Sprint)':'750m','M (Standard)':'1500m','L / 70.3':'1900m','XL / Ironman':'3800m' }
const TRI_BIKE: Record<string, string> = { 'XS (Super Sprint)':'8km','S (Sprint)':'20km','M (Standard)':'40km','L / 70.3':'90km','XL / Ironman':'180km' }
const TRI_RUN:  Record<string, string> = { 'XS (Super Sprint)':'1km','S (Sprint)':'5km','M (Standard)':'10km','L / 70.3':'21.1km','XL / Ironman':'42.2km' }

// ── Helpers ───────────────────────────────────────
function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() || 7 }

// ── Supabase hook ─────────────────────────────────
function useCalendar() {
  const supabase = createClient()
  const [races,       setRaces]       = useState<Race[]>([])
  const [raceStages,  setRaceStages]  = useState<RaceStage[]>([])
  const [eventTypes,  setEventTypes]  = useState<CalEventType[]>([])
  const [events,      setEvents]      = useState<CalEvent[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [r, rs, et, ev] = await Promise.all([
      supabase.from('planned_races').select('*').eq('user_id', user.id).order('date'),
      supabase.from('race_events').select('*').eq('user_id', user.id).order('start_date'),
      supabase.from('calendar_event_types').select('*').eq('user_id', user.id).order('name'),
      supabase.from('calendar_events').select('*').eq('user_id', user.id).order('date'),
    ])

    setRaces((r.data ?? []).map((x: Record<string, unknown>): Race => ({
      id: x.id as string, name: x.name as string,
      sport: x.sport as RaceSport, date: x.date as string, level: x.level as RaceLevel,
      goal: x.goal as string | undefined, strategy: x.strategy as string | undefined,
      runDistance: x.run_distance as string | undefined,
      triDistance: x.tri_distance as string | undefined,
      hyroxCategory: x.hyrox_category as string | undefined,
      hyroxLevel: x.hyrox_level as string | undefined,
      hyroxGender: x.hyrox_gender as string | undefined,
      goalTime: x.goal_time as string | undefined,
      goalSwimTime: x.goal_swim_time as string | undefined,
      goalBikeTime: x.goal_bike_time as string | undefined,
      goalRunTime: x.goal_run_time as string | undefined,
      validated: (x.validated as boolean | undefined) ?? false,
      validationData: (x.validation_data as Record<string, unknown> | undefined) ?? {},
      status: (x.status as 'upcoming' | 'completed' | undefined) ?? 'upcoming',
      distance: x.distance as string | undefined,
      performanceData: (x.performance_data as Record<string, unknown> | undefined) ?? {},
      notes: x.notes as string | undefined,
    })))

    setRaceStages((rs.data ?? []).map((x: Record<string, unknown>): RaceStage => ({
      id: x.id as string, name: x.name as string,
      startDate: x.start_date as string, endDate: x.end_date as string,
      description: x.description as string | undefined,
      dailyProgram: (x.daily_program as { date: string; content: string }[]) ?? [],
    })))

    setEventTypes((et.data ?? []).map((x: Record<string, unknown>): CalEventType => ({
      id: x.id as string, name: x.name as string, color: x.color as string,
      category: x.category as 'pro' | 'perso',
    })))

    setEvents((ev.data ?? []).map((x: Record<string, unknown>): CalEvent => ({
      id: x.id as string, category: x.category as 'race' | 'pro' | 'perso',
      typeId: x.type_id as string | undefined,
      date: x.date as string, title: x.title as string,
      description: x.description as string | undefined,
      color: x.color as string | undefined,
    })))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Race CRUD ──────────────────────────────────
  async function addRace(r: Omit<Race, 'id' | 'validated' | 'validationData'>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return null
    const { data, error } = await supabase.from('planned_races').insert({
      user_id: user.id, name: r.name, sport: r.sport, date: r.date, level: r.level,
      goal: r.goal ?? null, strategy: r.strategy ?? null,
      run_distance: r.runDistance ?? null, tri_distance: r.triDistance ?? null,
      hyrox_category: r.hyroxCategory ?? null, hyrox_level: r.hyroxLevel ?? null,
      hyrox_gender: r.hyroxGender ?? null, goal_time: r.goalTime ?? null,
      goal_swim_time: r.goalSwimTime ?? null, goal_bike_time: r.goalBikeTime ?? null,
      goal_run_time: r.goalRunTime ?? null, validated: false, validation_data: {},
      status: r.status ?? 'upcoming', distance: r.distance ?? null,
      performance_data: r.performanceData ?? {}, notes: r.notes ?? null,
    }).select().single()
    if (!error && data) {
      const row = data as Record<string, unknown>
      setRaces(p => [...p, { ...r, id: row.id as string, validated: false, validationData: {} }])
      return row.id as string
    }
    return null
  }

  async function addRaceWithFiles(
    r: Omit<Race, 'id' | 'validated' | 'validationData'>,
    files: File[], filesBike?: File[], filesRun?: File[],
  ) {
    const raceId = await addRace(r)
    if (!raceId) return
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const allFiles: { file: File; label?: string }[] = [
      ...files.map(f => ({ file: f })),
      ...(filesBike ?? []).map(f => ({ file: f, label: 'Parcours vélo' })),
      ...(filesRun  ?? []).map(f => ({ file: f, label: 'Parcours run' })),
    ]
    for (const { file, label } of allFiles) {
      try {
        const path = `${user.id}/${raceId}/${file.name}`
        const { data: upData } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
        if (upData) {
          const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
          await supabase.from('race_files').insert({
            race_id: raceId, file_url: urlData.publicUrl,
            file_name: file.name, file_type: file.type, label: label ?? null,
          })
        }
      } catch (e) { console.error('[file upload]', e) }
    }
  }

  async function markCompleted(id: string) {
    await supabase.from('planned_races').update({
      status: 'completed', updated_at: new Date().toISOString(),
    }).eq('id', id)
    setRaces(p => p.map(x => x.id === id ? { ...x, status: 'completed' as const } : x))
  }

  // ── RaceStage CRUD ─────────────────────────────
  async function addRaceStage(s: Omit<RaceStage, 'id'>, files: File[]) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data, error } = await supabase.from('race_events').insert({
      user_id: user.id, name: s.name, start_date: s.startDate, end_date: s.endDate,
      description: s.description ?? null, daily_program: s.dailyProgram,
    }).select().single()
    if (!error && data) {
      const row = data as Record<string, unknown>
      const stageId = row.id as string
      for (const file of files) {
        try {
          const path = `${user.id}/events/${stageId}/${file.name}`
          const { data: upData } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
          if (upData) {
            const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
            await supabase.from('race_event_files').insert({
              event_id: stageId, file_url: urlData.publicUrl, file_name: file.name,
            })
          }
        } catch (e) { console.error('[event file upload]', e) }
      }
      setRaceStages(p => [...p, { ...s, id: stageId }])
    }
  }

  async function updateRace(r: Race) {
    await supabase.from('planned_races').update({
      name: r.name, sport: r.sport, date: r.date, level: r.level,
      goal: r.goal ?? null, strategy: r.strategy ?? null,
      validated: r.validated ?? false, validation_data: r.validationData ?? {},
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    setRaces(p => p.map(x => x.id === r.id ? r : x))
  }

  async function deleteRace(id: string) {
    await supabase.from('planned_races').delete().eq('id', id)
    setRaces(p => p.filter(x => x.id !== id))
  }

  // ── EventType CRUD ─────────────────────────────
  async function addEventType(t: Omit<CalEventType, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data, error } = await supabase.from('calendar_event_types').insert({
      user_id: user.id, name: t.name, color: t.color, category: t.category,
    }).select().single()
    if (!error && data) setEventTypes(p => [...p, { ...t, id: data.id }])
  }

  async function updateEventType(t: CalEventType) {
    await supabase.from('calendar_event_types').update({ name: t.name, color: t.color }).eq('id', t.id)
    setEventTypes(p => p.map(x => x.id === t.id ? t : x))
  }

  async function deleteEventType(id: string) {
    await supabase.from('calendar_event_types').delete().eq('id', id)
    setEventTypes(p => p.filter(x => x.id !== id))
  }

  // ── Event CRUD ─────────────────────────────────
  async function addEvent(e: Omit<CalEvent, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data, error } = await supabase.from('calendar_events').insert({
      user_id: user.id, category: e.category, type_id: e.typeId ?? null,
      date: e.date, title: e.title, description: e.description ?? null, color: e.color ?? null,
    }).select().single()
    if (!error && data) setEvents(p => [...p, { ...e, id: data.id }])
  }

  async function updateEvent(e: CalEvent) {
    await supabase.from('calendar_events').update({
      type_id: e.typeId ?? null, date: e.date, title: e.title,
      description: e.description ?? null, color: e.color ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', e.id)
    setEvents(p => p.map(x => x.id === e.id ? e : x))
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(p => p.filter(x => x.id !== id))
  }

  return {
    races, raceStages, eventTypes, events, loading,
    addRace, addRaceWithFiles, updateRace, deleteRace, markCompleted,
    addRaceStage,
    addEventType, updateEventType, deleteEventType,
    addEvent, updateEvent, deleteEvent,
  }
}

// ════════════════════════════════════════════════
// RACE MODALS (legacy — kept for reference, not used)
// ════════════════════════════════════════════════
function RaceAddModal({ month, day, year, onClose, onSave }: {
  month: number; day?: number; year: number; onClose: () => void
  onSave: (r: Omit<Race, 'id' | 'validated' | 'validationData'>) => void
}) {
  const dd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`
  const [sport, setSport] = useState<RaceSport>('run')
  const [name, setName]   = useState('')
  const [date, setDate]   = useState(dd)
  const [level, setLevel] = useState<RaceLevel>('important')
  const [runDist, setRunDist]   = useState(RUN_DISTANCES[2])
  const [triDist, setTriDist]   = useState(TRI_DISTANCES[1])
  const [hyroxCat, setHyroxCat] = useState('')
  const [hyroxLvl, setHyroxLvl] = useState('')
  const [hyroxGen, setHyroxGen] = useState('')
  const [goalTime, setGoalTime] = useState('')
  const [goalSwim, setGoalSwim] = useState('')
  const [goalBike, setGoalBike] = useState('')
  const [goalRun,  setGoalRun]  = useState('')
  const RACE_SPORTS: RaceSport[] = ['run','bike','swim','hyrox','triathlon','rowing']
  const RSL: Record<RaceSport, string> = { run:'Course à pied',bike:'Cyclisme',swim:'Natation',hyrox:'Hyrox',triathlon:'Triathlon',rowing:'Aviron' }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:500,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Ajouter une course</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Sport</p>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:14 }}>
          {RACE_SPORTS.map(s => (
            <button key={s} onClick={() => { setSport(s); setHyroxCat(''); setHyroxLvl(''); setHyroxGen('') }}
              style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',borderColor:sport===s?SPORT_BORDER[s as SportType]:'var(--border)',background:sport===s?SPORT_BG[s as SportType]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s as SportType]:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>
              {RSL[s]}
            </button>
          ))}
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Niveau</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14 }}>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(l => {
            const cfg = RACE_CONFIG[l]
            return (
              <button key={l} onClick={() => setLevel(l)}
                style={{ padding:'8px 10px',borderRadius:9,border:'1px solid',cursor:'pointer',textAlign:'left',borderColor:level===l?cfg.border:'var(--border)',background:level===l?cfg.bg:'var(--bg-card2)' }}>
                <p style={{ fontSize:11,fontWeight:600,margin:0,color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.label}</p>
              </button>
            )
          })}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:9,marginBottom:12 }}>
          <div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Nom</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ironman Nice"
              style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
          <div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
        </div>
        {sport === 'run' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:8 }}>
              {RUN_DISTANCES.map(d => (
                <button key={d} onClick={() => setRunDist(d)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:runDist===d?'#22c55e':'var(--border)',background:runDist===d?'rgba(34,197,94,0.10)':'var(--bg-card2)',color:runDist===d?'#22c55e':'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{d}</button>
              ))}
            </div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif de temps</p>
            <input value={goalTime} onChange={e => setGoalTime(e.target.value)} placeholder="Ex: 1h25:00"
              style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/>
          </div>
        )}
        {sport === 'triathlon' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p>
            <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:10 }}>
              {TRI_DISTANCES.map(d => (
                <button key={d} onClick={() => setTriDist(d)} style={{ padding:'8px 12px',borderRadius:9,border:'1px solid',borderColor:triDist===d?'#a855f7':'var(--border)',background:triDist===d?'rgba(168,85,247,0.10)':'var(--bg-card2)',cursor:'pointer',textAlign:'left' }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:triDist===d?'#a855f7':'var(--text)' }}>{d}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>Nat {TRI_SWIM[d]} · Vélo {TRI_BIKE[d]} · Run {TRI_RUN[d]}</p>
                </button>
              ))}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {[{l:'Natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'Vélo',v:goalBike,s:setGoalBike,p:'2h25'},{l:'Run',v:goalRun,s:setGoalRun,p:'1h35'},{l:'Total',v:goalTime,s:setGoalTime,p:'4h40'}].map(x => (
                <div key={x.l}>
                  <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>{x.l}</p>
                  <input value={x.v} onChange={e => x.s(e.target.value)} placeholder={x.p}
                    style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {!['run','triathlon','hyrox'].includes(sport) && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif</p>
            <input value={goalTime} onChange={e => setGoalTime(e.target.value)} placeholder="Ex: Podium"
              style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
        )}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={() => onSave({ name:name||'Course',sport,date,level,goal:goalTime||undefined,runDistance:sport==='run'?runDist:undefined,triDistance:sport==='triathlon'?triDist:undefined,hyroxCategory:hyroxCat||undefined,hyroxLevel:hyroxLvl||undefined,hyroxGender:hyroxGen||undefined,goalTime:goalTime||undefined,goalSwimTime:goalSwim||undefined,goalBikeTime:goalBike||undefined,goalRunTime:goalRun||undefined })}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            + Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceEditModal({ race, onClose, onSave }: { race: Race; onClose: () => void; onSave: (r: Race) => void }) {
  const [form, setForm] = useState<Race>({ ...race })
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:440,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Modifier la course</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Nom</p>
          <input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6 }}>Niveau</p>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {(['secondary','important','main','gty'] as RaceLevel[]).map(l => {
              const cfg = RACE_CONFIG[l]
              return (
                <button key={l} onClick={() => setForm({ ...form, level:l })}
                  style={{ padding:'4px 9px',borderRadius:7,border:'1px solid',borderColor:form.level===l?cfg.border:'var(--border)',background:form.level===l?cfg.bg:'var(--bg-card2)',color:form.level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text-mid)',fontSize:10,cursor:'pointer',fontWeight:form.level===l?700:400 }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif</p>
          <input value={form.goal ?? ''} onChange={e => setForm({ ...form, goal:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Stratégie</p>
          <textarea value={form.strategy ?? ''} onChange={e => setForm({ ...form, strategy:e.target.value })} rows={2}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' }}/>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={() => onSave(form)}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({ race, onClose, onDelete, onEdit }: {
  race: Race; onClose: () => void; onDelete: (id: string) => void; onEdit: () => void
}) {
  const cfg  = RACE_CONFIG[race.level]
  const days = daysUntil(race.date)
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:460,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14 }}>
          <div>
            <span style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{cfg.label}</span>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'6px 0 2px' }}>{race.name}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{race.sport} · {new Date(race.date).toLocaleDateString('fr-FR',{ weekday:'long',day:'numeric',month:'long',year:'numeric' })}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>{race.runDistance}</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>{race.triDistance}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 14px',borderRadius:11,background:days > 0 ? cfg.bg : 'var(--bg-card2)',border:`1px solid ${days > 0 ? cfg.border + '44' : 'var(--border)'}`,marginBottom:12 }}>
          <div style={{ textAlign:'center',minWidth:44 }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:days > 0 ? 26 : 16,fontWeight:800,color:days > 0 ? race.level==='gty'?'var(--gty-text)':cfg.color : 'var(--text-dim)',margin:0,lineHeight:1 }}>{days > 0 ? days : '✓'}</p>
            <p style={{ fontSize:9,color:'var(--text-dim)',margin:'2px 0 0' }}>{days > 0 ? 'jours' : 'Passée'}</p>
          </div>
          {race.goal && (
            <div>
              <p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 2px' }}>Objectif</p>
              <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{race.goal}</p>
            </div>
          )}
        </div>
        {race.strategy && (
          <div style={{ padding:'10px 12px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:12 }}>
            <p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 4px' }}>Stratégie</p>
            <p style={{ fontSize:12,margin:0,color:'var(--text-mid)',lineHeight:1.5 }}>{race.strategy}</p>
          </div>
        )}
        <div style={{ display:'flex',gap:7 }}>
          <button onClick={() => { onDelete(race.id); onClose() }}
            style={{ padding:'8px 12px',borderRadius:9,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:11,cursor:'pointer' }}>
            Supprimer
          </button>
          <button onClick={onEdit}
            style={{ flex:1,padding:'8px 12px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>
            Modifier
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Événement Race Modal (gray, stored in calendar_events) ─
function RaceEventModal({ month, day, year, onClose, onSave }: {
  month: number; day?: number; year: number; onClose: () => void
  onSave: (e: Omit<CalEvent, 'id'>) => void
}) {
  const dd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`
  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState(dd)
  const [description, setDesc]  = useState('')
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:420,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Ajouter un événement</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Stage de préparation"
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Description</p>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optionnel…"
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' }}/>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={() => { if (title && date) { onSave({ category:'race',date,title,description:description||undefined,color:'#9ca3af' }); onClose() } }}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#6b7280,#9ca3af)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            + Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RACE TAB — new component-based implementation
// ════════════════════════════════════════════════
function RaceTab({ races, raceStages, addRaceWithFiles, updateRace, deleteRace, markCompleted, addRaceStage }: {
  races: Race[]; raceStages: RaceStage[]
  addRaceWithFiles: (r: Omit<Race, 'id' | 'validated' | 'validationData'>, files: File[], fb?: File[], fr?: File[]) => Promise<void>
  updateRace: (r: Race) => void; deleteRace: (id: string) => void
  markCompleted: (id: string) => void
  addRaceStage: (s: Omit<RaceStage, 'id'>, files: File[]) => Promise<void>
}) {
  const [calView,      setCalView]      = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [showRaceModal,  setShowRaceModal]  = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editRace,    setEditRace]    = useState<Race | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined)
  const year = new Date().getFullYear()
  const gty  = races.find(r => r.level === 'gty' && new Date(r.date).getFullYear() === year)

  function openNewRace(date?: string) {
    setEditRace(null)
    setPrefillDate(date)
    setShowRaceModal(true)
  }
  function closeRaceModal() {
    setShowRaceModal(false)
    setEditRace(null)
    setPrefillDate(undefined)
  }

  async function handleSaveRace(
    r: Omit<Race, 'id' | 'validated' | 'validationData'>,
    files: File[], filesBike?: File[], filesRun?: File[],
  ) {
    if (editRace) {
      updateRace({ ...editRace, ...r })
    } else {
      await addRaceWithFiles(r, files, filesBike, filesRun)
    }
    closeRaceModal()
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      <GoalBanner gty={gty} races={races} />

      {/* Controls */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8 }}>
        <div style={{ display:'flex',gap:5 }}>
          {(['year','month'] as CalView[]).map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{
              padding:'6px 12px',borderRadius:9,border:'1px solid',fontSize:11,cursor:'pointer',fontWeight:calView===v?600:400,
              borderColor:calView===v?'#00c8e0':'var(--border)',
              background:calView===v?'rgba(0,200,224,0.10)':'var(--bg-card)',
              color:calView===v?'#00c8e0':'var(--text-mid)',
            }}>
              {v === 'year' ? 'Vue annuelle' : 'Vue mensuelle'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex',gap:6 }}>
          <button onClick={() => setShowEventModal(true)} style={{
            padding:'6px 12px',borderRadius:9,fontSize:11,fontWeight:600,cursor:'pointer',
            background:'rgba(59,130,246,0.10)',border:'1px solid rgba(59,130,246,0.3)',color:'#3b82f6',
          }}>
            Événement
          </button>
          <button onClick={() => openNewRace()} style={{
            padding:'6px 12px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',
            border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',
          }}>
            + Course
          </button>
        </div>
      </div>

      {/* Views */}
      {calView === 'year' && (
        <AnnualView
          races={races} stages={raceStages} year={year}
          onRaceClick={r => { setEditRace(r); setShowRaceModal(true) }}
          onMonthClick={m => { setCurrentMonth(m); setCalView('month') }}
          onMarkComplete={markCompleted}
        />
      )}
      {calView === 'month' && (
        <MonthlyView
          races={races} stages={raceStages} year={year}
          initialMonth={currentMonth}
          onRaceClick={r => { setEditRace(r); setPrefillDate(undefined); setShowRaceModal(true) }}
          onDayClick={date => openNewRace(date)}
        />
      )}

      {/* Next race bar */}
      <NextRaceBar races={races} onEdit={r => { setEditRace(r); setShowRaceModal(true) }} />

      {/* Empty state */}
      {races.length === 0 && raceStages.length === 0 && (
        <div style={{ padding:'32px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 6px' }}>Aucune course planifiée</p>
          <button onClick={() => openNewRace()} style={{
            padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',
            border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',
          }}>
            + Ajouter une course
          </button>
        </div>
      )}

      {showRaceModal && (
        <RaceModal
          race={editRace ?? undefined}
          initialDate={prefillDate}
          onClose={closeRaceModal}
          onSave={handleSaveRace}
        />
      )}
      {showEventModal && (
        <EventModal
          onClose={() => setShowEventModal(false)}
          onSave={async (s, files) => { await addRaceStage(s, files); setShowEventModal(false) }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// CATEGORY EVENT MODAL (Pro / Perso)
// ════════════════════════════════════════════════
function CategoryEventModal({ category, eventTypes, initialDate, onClose, onSave }: {
  category: 'pro' | 'perso'; eventTypes: CalEventType[]
  initialDate: string; onClose: () => void
  onSave: (e: Omit<CalEvent, 'id'>) => void
}) {
  const types = eventTypes.filter(t => t.category === category)
  const [title, setTitle]     = useState('')
  const [date, setDate]       = useState(initialDate)
  const [desc, setDesc]       = useState('')
  const [typeId, setTypeId]   = useState<string>(types[0]?.id ?? '')

  const selectedType = types.find(t => t.id === typeId)

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:420,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>
            Ajouter un événement {CATEGORY_CONFIG[category].label}
          </h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        {types.length === 0 ? (
          <div style={{ padding:'16px',textAlign:'center',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:14 }}>
            <p style={{ fontSize:12,color:'var(--text-dim)',margin:0 }}>Créez d'abord un type d'événement dans la section Types →</p>
          </div>
        ) : (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Type</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
              {types.map(t => (
                <button key={t.id} onClick={() => setTypeId(t.id)}
                  style={{ padding:'5px 10px',borderRadius:20,border:'1px solid',borderColor:typeId===t.id?t.color:'var(--border)',background:typeId===t.id?t.color+'22':'var(--bg-card2)',color:typeId===t.id?t.color:'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:typeId===t.id?600:400 }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Réunion importante"
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Description</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optionnel…"
            style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' }}/>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button
            onClick={() => {
              if (!title || !date || !typeId) return
              onSave({ category, typeId, date, title, description:desc||undefined, color: selectedType?.color })
              onClose()
            }}
            style={{ flex:2,padding:10,borderRadius:10,background:selectedType ? selectedType.color : 'var(--bg-card2)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            + Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// CATEGORY TAB (Pro / Perso)
// ════════════════════════════════════════════════
function CategoryTab({ category, eventTypes, events, addEventType, updateEventType, deleteEventType, addEvent, deleteEvent }: {
  category: 'pro' | 'perso'
  eventTypes: CalEventType[]; events: CalEvent[]
  addEventType: (t: Omit<CalEventType, 'id'>) => void
  updateEventType: (t: CalEventType) => void
  deleteEventType: (id: string) => void
  addEvent: (e: Omit<CalEvent, 'id'>) => void
  deleteEvent: (id: string) => void
}) {
  const cfg = CATEGORY_CONFIG[category]
  const year = new Date().getFullYear()
  const [calView, setCalView]           = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [newTypeName, setNewTypeName]   = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6')
  const [editingType, setEditingType]   = useState<CalEventType | null>(null)
  const [addEventModal, setAddEventModal] = useState<string | null>(null) // date string

  const myTypes  = eventTypes.filter(t => t.category === category)
  const myEvents = events.filter(e => e.category === category)

  function getColor(e: CalEvent): string {
    if (e.color) return e.color
    const t = eventTypes.find(t => t.id === e.typeId)
    return t?.color ?? cfg.color
  }

  function getEventsForMonth(m: number) {
    return myEvents.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === m })
  }

  const PRESET_COLORS = ['#3b82f6','#ef4444','#a855f7','#22c55e','#f97316','#eab308','#ec4899','#14b8a6','#f43f5e','#8b5cf6']

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8 }}>
        <div style={{ display:'flex',gap:5 }}>
          {([['year','Vue annuelle'],['month','Vue mensuelle']] as [CalView,string][]).map(([v, l]) => (
            <button key={v} onClick={() => setCalView(v)}
              style={{ padding:'6px 12px',borderRadius:9,border:'1px solid',borderColor:calView===v?cfg.color:'var(--border)',background:calView===v?cfg.bg:'var(--bg-card)',color:calView===v?cfg.color:'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:calView===v?600:400 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display:'flex',gap:6 }}>
          <button onClick={() => setShowTypeManager(!showTypeManager)}
            style={{ padding:'6px 12px',borderRadius:9,background:showTypeManager?cfg.bg:'var(--bg-card)',border:`1px solid ${showTypeManager?cfg.color:'var(--border)'}`,color:showTypeManager?cfg.color:'var(--text-mid)',fontSize:11,fontWeight:600,cursor:'pointer' }}>
            ⚙ Types
          </button>
          <button onClick={() => setAddEventModal(`${year}-${String(currentMonth+1).padStart(2,'0')}-01`)}
            style={{ padding:'6px 12px',borderRadius:9,background:cfg.color,border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>
            + Événement
          </button>
        </div>
      </div>

      {/* Type Manager */}
      {showTypeManager && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 12px' }}>⚙ Gérer les types</p>

          {/* Existing types */}
          {myTypes.length > 0 && (
            <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:12 }}>
              {myTypes.map(t => (
                <div key={t.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                  <div style={{ width:12,height:12,borderRadius:'50%',background:t.color,flexShrink:0 }}/>
                  {editingType?.id === t.id ? (
                    <>
                      <input value={editingType.name} onChange={e => setEditingType({ ...editingType, name:e.target.value })}
                        style={{ flex:1,padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
                      <div style={{ display:'flex',gap:4 }}>
                        {PRESET_COLORS.map(c => (
                          <div key={c} onClick={() => setEditingType({ ...editingType, color:c })}
                            style={{ width:14,height:14,borderRadius:'50%',background:c,cursor:'pointer',border:editingType.color===c?'2px solid var(--text)':'2px solid transparent' }}/>
                        ))}
                      </div>
                      <button onClick={() => { updateEventType(editingType); setEditingType(null) }}
                        style={{ padding:'3px 8px',borderRadius:6,background:cfg.color,border:'none',color:'#fff',fontSize:10,cursor:'pointer' }}>✓</button>
                      <button onClick={() => setEditingType(null)}
                        style={{ padding:'3px 6px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex:1,fontSize:12,color:'var(--text)' }}>{t.name}</span>
                      <span style={{ fontSize:10,color:'var(--text-dim)' }}>{myEvents.filter(e => e.typeId === t.id).length} événement(s)</span>
                      <button onClick={() => setEditingType({ ...t })}
                        style={{ padding:'3px 6px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:10,cursor:'pointer' }}>Edit</button>
                      <button onClick={() => deleteEventType(t.id)}
                        style={{ padding:'3px 6px',borderRadius:6,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',fontSize:10,cursor:'pointer' }}>✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new type */}
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nom du type (ex: Deadline)"
              style={{ flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
            <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
              {PRESET_COLORS.map(c => (
                <div key={c} onClick={() => setNewTypeColor(c)}
                  style={{ width:16,height:16,borderRadius:'50%',background:c,cursor:'pointer',border:newTypeColor===c?'2px solid var(--text)':'2px solid transparent' }}/>
              ))}
            </div>
            <button onClick={() => { if (newTypeName.trim()) { addEventType({ name:newTypeName.trim(),color:newTypeColor,category }); setNewTypeName('') } }}
              style={{ padding:'7px 12px',borderRadius:8,background:cfg.color,border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' }}>
              + Type
            </button>
          </div>
        </div>
      )}

      {/* Year view */}
      {calView === 'year' && (
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,minmax(150px,1fr))',gap:10,minWidth:580 }}>
            {MONTHS.map((_, mi) => {
              const me = getEventsForMonth(mi).sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate())
              return (
                <div key={mi} onClick={() => { setCurrentMonth(mi); setCalView('month') }}
                  style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:12,boxShadow:'var(--shadow-card)',cursor:'pointer' }}>
                  <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 7px',color:me.length>0?'var(--text)':'var(--text-dim)' }}>{MONTH_SHORT[mi]}</p>
                  {me.length > 0 ? me.map(e => {
                    const col = getColor(e)
                    return (
                      <div key={e.id}
                        style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:7,background:`${col}18`,border:`1px solid ${col}44`,marginBottom:4 }}>
                        <div style={{ width:6,height:6,borderRadius:'50%',background:col,flexShrink:0 }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:col }}>{e.title}</p>
                          <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>{new Date(e.date).getDate()} {MONTH_SHORT[mi]}</p>
                        </div>
                      </div>
                    )
                  }) : <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,fontStyle:'italic' }}>Aucun</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Month view */}
      {calView === 'month' && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:16,boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <button onClick={() => setCurrentMonth(m => Math.max(0, m - 1))} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>←</button>
              <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>{MONTHS[currentMonth]} {year}</h2>
              <button onClick={() => setCurrentMonth(m => Math.min(11, m + 1))} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>→</button>
            </div>
            <button onClick={() => setAddEventModal(`${year}-${String(currentMonth+1).padStart(2,'0')}-15`)}
              style={{ padding:'5px 10px',borderRadius:8,background:cfg.bg,border:`1px solid ${cfg.color}44`,color:cfg.color,fontSize:10,cursor:'pointer' }}>
              + Événement
            </button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:5 }}>
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <div key={i} style={{ textAlign:'center',fontSize:9,fontWeight:600,color:'var(--text-dim)',padding:'3px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
            {Array.from({ length: getFirstDay(year, currentMonth) - 1 }, (_, i) => (
              <div key={`e${i}`} style={{ minHeight:60,borderRadius:7,background:'var(--bg-card2)',opacity:0.3 }}/>
            ))}
            {Array.from({ length: getDaysInMonth(year, currentMonth) }, (_, i) => {
              const day = i + 1
              const ds  = `${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const de  = myEvents.filter(e => e.date === ds)
              const isToday = new Date().toDateString() === new Date(ds).toDateString()
              return (
                <div key={day} onClick={() => setAddEventModal(ds)}
                  style={{ minHeight:60,borderRadius:7,background:'var(--bg-card2)',border:`1px solid ${isToday?cfg.color:'var(--border)'}`,padding:'3px 4px',cursor:'pointer',display:'flex',flexDirection:'column',gap:1 }}>
                  <p style={{ fontSize:10,fontWeight:isToday?700:500,color:isToday?cfg.color:'var(--text-mid)',margin:0,textAlign:'right' }}>{day}</p>
                  {de.map(ev => {
                    const col = getColor(ev)
                    return (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                        style={{ borderRadius:3,padding:'1px 3px',background:`${col}22`,border:`1px solid ${col}44`,cursor:'pointer' }}
                        title="Cliquer pour supprimer">
                        <p style={{ fontSize:7,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:col }}>{ev.title}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {myEvents.length === 0 && !showTypeManager && (
        <div style={{ padding:'28px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:`${cfg.color}20`,border:`1px solid ${cfg.color}40`,margin:'0 auto 10px' }}/>

          <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 6px' }}>Aucun événement {cfg.label}</p>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'0 0 12px' }}>Créez d'abord vos types, puis ajoutez des événements</p>
          <button onClick={() => setShowTypeManager(true)}
            style={{ padding:'8px 16px',borderRadius:9,background:cfg.color,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:600,fontSize:12,cursor:'pointer' }}>
            ⚙ Créer un type
          </button>
        </div>
      )}

      {addEventModal && (
        <CategoryEventModal
          category={category} eventTypes={eventTypes}
          initialDate={addEventModal}
          onClose={() => setAddEventModal(null)}
          onSave={e => { addEvent(e); setAddEventModal(null) }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// ALL TAB — VERTICALE + CIRCULAIRE
// ════════════════════════════════════════════════
type AllView = 'vertical' | 'circular'

const SPORT_ABBR: Record<RaceSport, string> = {
  run: 'RUN', bike: 'BIK', swim: 'SWI',
  hyrox: 'HYR', triathlon: 'TRI', rowing: 'ROW',
}

function AllTab({ races, eventTypes, events }: { races: Race[]; eventTypes: CalEventType[]; events: CalEvent[] }) {
  const [view, setView] = useState<AllView>('vertical')
  const year = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]

  // Build unified event list for current year
  interface UnifiedEvent {
    id: string; date: string; title: string
    category: 'race' | 'pro' | 'perso'
    color: string
    level?: RaceLevel
    sport?: RaceSport
  }

  const yearRaces = races
    .filter(r => r.date.startsWith(String(year)))
    .map((r): UnifiedEvent => ({
      id: r.id, date: r.date, title: r.name,
      category: 'race', color: r.level === 'gty' ? '#ffffff' : RACE_CONFIG[r.level].color,
      level: r.level, sport: r.sport,
    }))

  const yearEvents = events
    .filter(e => e.date.startsWith(String(year)) && (e.category === 'pro' || e.category === 'perso'))
    .map((e): UnifiedEvent => {
      const t = eventTypes.find(t => t.id === e.typeId)
      return {
        id: e.id, date: e.date, title: e.title,
        category: e.category as 'pro' | 'perso',
        color: e.color ?? t?.color ?? CATEGORY_CONFIG[e.category as 'pro'|'perso']?.color ?? '#6b7280',
      }
    })

  const unified = [...yearRaces, ...yearEvents].sort((a, b) => a.date.localeCompare(b.date))

  // Group by month
  const byMonth: Record<number, UnifiedEvent[]> = {}
  for (const ev of unified) {
    const m = new Date(ev.date + 'T12:00:00').getMonth()
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(ev)
  }

  // ClockView data
  const clockEvents: ClockEvent[] = unified.map(ev => ({
    id: ev.id, date: ev.date, title: ev.title,
    color: ev.color, isGty: ev.level === 'gty',
    categoryLabel: ev.category.toUpperCase(),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {([['vertical', '↕ Vertical'], ['circular', '◎ Circulaire']] as [AllView, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '6px 13px', borderRadius: 9, border: '1px solid', fontSize: 11, cursor: 'pointer',
            fontWeight: view === v ? 600 : 400,
            borderColor: view === v ? '#00c8e0' : 'var(--border)',
            background: view === v ? 'rgba(0,200,224,0.10)' : 'var(--bg-card)',
            color: view === v ? '#00c8e0' : 'var(--text-mid)',
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* Circular view */}
      {view === 'circular' && <ClockView events={clockEvents} year={year} />}

      {/* Vertical view */}
      {view === 'vertical' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {unified.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic' }}>Aucun événement pour {year}</p>
            </div>
          )}
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([mi, monthEvents]) => (
              <div key={mi} style={{ paddingTop: 24 }}>
                {/* Month header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.10em',
                    textTransform: 'uppercase' as const, color: 'var(--text-mid)',
                  }}>
                    {MONTH_SHORT[Number(mi)]}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {monthEvents.length} événement{monthEvents.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Events */}
                {monthEvents.map(ev => {
                  const isPast = ev.date < today
                  const days   = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86_400_000)
                  const lvlCfg = ev.level ? RACE_CONFIG[ev.level] : null
                  const dotColor = ev.category === 'race' ? '#ef4444' : ev.category === 'pro' ? '#3b82f6' : '#a855f7'

                  return (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      padding: '10px 4px',
                      borderBottom: '1px solid var(--border)',
                      opacity: isPast ? 0.45 : 1,
                    }}>
                      {/* Dot — seul élément coloré */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dotColor, flexShrink: 0,
                      }} />

                      {/* Day number */}
                      <span style={{
                        fontSize: 11, color: 'var(--text-dim)',
                        fontFamily: 'DM Mono, monospace',
                        flexShrink: 0, minWidth: 18,
                      }}>
                        {new Date(ev.date + 'T12:00:00').getDate()}
                      </span>

                      {/* Level badge — outline only, no color fill */}
                      {lvlCfg && (
                        <span style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 20,
                          border: '1px solid var(--border)',
                          color: 'var(--text-mid)',
                          flexShrink: 0, whiteSpace: 'nowrap' as const,
                        }}>
                          {lvlCfg.label}
                        </span>
                      )}

                      {/* Sport abbr */}
                      {ev.sport && (
                        <span style={{
                          fontSize: 10, color: 'var(--text-dim)',
                          fontFamily: 'DM Mono, monospace', flexShrink: 0,
                        }}>
                          {SPORT_ABBR[ev.sport]}
                        </span>
                      )}

                      {/* Title */}
                      <span style={{
                        flex: 1, fontSize: 13, fontWeight: 500,
                        color: 'var(--text)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      }}>
                        {ev.title}
                      </span>

                      {/* Countdown / past */}
                      {isPast ? (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                          ✓ Passé
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--text-mid)',
                          fontFamily: 'DM Mono, monospace', flexShrink: 0,
                        }}>
                          {days === 0 ? 'Auj.' : `J-${days}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function CalendarPage() {
  const [tab, setTab] = useState<CalTab>('race')
  const { races, raceStages, eventTypes, events, loading, addRaceWithFiles, updateRace, deleteRace, markCompleted, addRaceStage, addEventType, updateEventType, deleteEventType, addEvent, updateEvent, deleteEvent } = useCalendar()

  const TABS: { id: CalTab; label: string; short: string; color: string; bg: string }[] = [
    { id:'race',  label:'Race',  short:'Race',  color:'#ef4444', bg:'rgba(239,68,68,0.10)'  },
    { id:'pro',   label:'Pro',   short:'Pro',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)' },
    { id:'perso', label:'Perso', short:'Perso', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
    { id:'all',   label:'All',   short:'All',   color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
  ]

  const aiContext = {
    page: 'strategy',
    races: races.map(r => ({
      name:         r.name,
      sport:        r.sport,
      date:         r.date,
      level:        r.level,
      goal:         r.goal,
      goal_time:    r.goalTime,
      run_distance: r.runDistance,
      tri_distance: r.triDistance,
      validated:    r.validated,
    })),
    eventsCount: events.length,
  }

  return (
    <div style={{ padding:'24px 28px',maxWidth:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Calendar</h1>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>Race · Pro · Perso · Vue globale</p>
        </div>
        <AIAssistantButton agent="strategy" context={aiContext} />
      </div>

      {/* Tab pills */}
      <div style={{ display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding:'40px',textAlign:'center',color:'var(--text-dim)',fontSize:13 }}>Chargement…</div>
      )}

      {!loading && (
        <>
          {tab === 'race'  && <RaceTab races={races} raceStages={raceStages} addRaceWithFiles={addRaceWithFiles} updateRace={updateRace} deleteRace={deleteRace} markCompleted={markCompleted} addRaceStage={addRaceStage}/>}
          {tab === 'pro'   && <CategoryTab category="pro"   eventTypes={eventTypes} events={events} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} addEvent={addEvent} deleteEvent={deleteEvent}/>}
          {tab === 'perso' && <CategoryTab category="perso" eventTypes={eventTypes} events={events} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} addEvent={addEvent} deleteEvent={deleteEvent}/>}
          {tab === 'all'   && <AllTab races={races} eventTypes={eventTypes} events={events}/>}
        </>
      )}
    </div>
  )
}
