'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  validated?: boolean; validationData?: Record<string, any>
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
const SPORT_EMOJI: Record<string, string> = {
  run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪', triathlon:'🔱', rowing:'🚣',
}

const RACE_CONFIG: Record<RaceLevel, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e', emoji:'🟢' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316', emoji:'🟠' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444', emoji:'🔴' },
  gty:       { label:'GTY', color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)', emoji:'⚫' },
}

const EVENT_CONFIG = { label:'Événement', color:'#9ca3af', bg:'rgba(156,163,175,0.12)', border:'#9ca3af', emoji:'📅' }

const CATEGORY_CONFIG = {
  race:  { label:'Race',  color:'#ef4444', bg:'rgba(239,68,68,0.10)',  icon:'🏁' },
  pro:   { label:'Pro',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)', icon:'💼' },
  perso: { label:'Perso', color:'#a855f7', bg:'rgba(168,85,247,0.10)', icon:'🌿' },
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
  const [races,      setRaces]      = useState<Race[]>([])
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([])
  const [events,     setEvents]     = useState<CalEvent[]>([])
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [r, et, ev] = await Promise.all([
      supabase.from('planned_races').select('*').eq('user_id', user.id).order('date'),
      supabase.from('calendar_event_types').select('*').eq('user_id', user.id).order('name'),
      supabase.from('calendar_events').select('*').eq('user_id', user.id).order('date'),
    ])

    setRaces((r.data ?? []).map((x: any): Race => ({
      id: x.id, name: x.name, sport: x.sport, date: x.date, level: x.level,
      goal: x.goal, strategy: x.strategy, runDistance: x.run_distance,
      triDistance: x.tri_distance, hyroxCategory: x.hyrox_category,
      hyroxLevel: x.hyrox_level, hyroxGender: x.hyrox_gender,
      goalTime: x.goal_time, goalSwimTime: x.goal_swim_time,
      goalBikeTime: x.goal_bike_time, goalRunTime: x.goal_run_time,
      validated: x.validated ?? false, validationData: x.validation_data ?? {},
    })))

    setEventTypes((et.data ?? []).map((x: any): CalEventType => ({
      id: x.id, name: x.name, color: x.color, category: x.category,
    })))

    setEvents((ev.data ?? []).map((x: any): CalEvent => ({
      id: x.id, category: x.category, typeId: x.type_id,
      date: x.date, title: x.title, description: x.description, color: x.color,
    })))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Race CRUD ──────────────────────────────────
  async function addRace(r: Omit<Race, 'id' | 'validated' | 'validationData'>) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data, error } = await supabase.from('planned_races').insert({
      user_id: user.id, name: r.name, sport: r.sport, date: r.date, level: r.level,
      goal: r.goal ?? null, strategy: r.strategy ?? null,
      run_distance: r.runDistance ?? null, tri_distance: r.triDistance ?? null,
      hyrox_category: r.hyroxCategory ?? null, hyrox_level: r.hyroxLevel ?? null,
      hyrox_gender: r.hyroxGender ?? null, goal_time: r.goalTime ?? null,
      goal_swim_time: r.goalSwimTime ?? null, goal_bike_time: r.goalBikeTime ?? null,
      goal_run_time: r.goalRunTime ?? null, validated: false, validation_data: {},
    }).select().single()
    if (!error && data) setRaces(p => [...p, { ...r, id: data.id, validated: false, validationData: {} }])
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

  return { races, eventTypes, events, loading, addRace, updateRace, deleteRace, addEventType, updateEventType, deleteEventType, addEvent, updateEvent, deleteEvent }
}

// ════════════════════════════════════════════════
// RACE MODALS
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
              {SPORT_EMOJI[s]} {RSL[s]}
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
                <p style={{ fontSize:11,fontWeight:600,margin:0,color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.emoji} {cfg.label}</p>
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
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>🏊 {TRI_SWIM[d]} · 🚴 {TRI_BIKE[d]} · 🏃 {TRI_RUN[d]}</p>
                </button>
              ))}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {[{l:'🏊 Natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'🚴 Vélo',v:goalBike,s:setGoalBike,p:'2h25'},{l:'🏃 Run',v:goalRun,s:setGoalRun,p:'1h35'},{l:'⏱ Total',v:goalTime,s:setGoalTime,p:'4h40'}].map(x => (
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
                  {cfg.emoji} {cfg.label}
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
            <span style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{cfg.emoji} {cfg.label}</span>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'6px 0 2px' }}>{race.name}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{SPORT_EMOJI[race.sport]} · {new Date(race.date).toLocaleDateString('fr-FR',{ weekday:'long',day:'numeric',month:'long',year:'numeric' })}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>📏 {race.runDistance}</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>🔱 {race.triDistance}</p>}
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
              <p style={{ fontSize:13,fontWeight:600,margin:0 }}>🎯 {race.goal}</p>
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
            ✏️ Modifier
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
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>📅 Ajouter un événement</h3>
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
// RACE TAB
// ════════════════════════════════════════════════
function RaceTab({ races, events, addRace, updateRace, deleteRace, addEvent, deleteEvent }: {
  races: Race[]; events: CalEvent[]
  addRace: (r: Omit<Race, 'id' | 'validated' | 'validationData'>) => void
  updateRace: (r: Race) => void; deleteRace: (id: string) => void
  addEvent: (e: Omit<CalEvent, 'id'>) => void; deleteEvent: (id: string) => void
}) {
  const [calView, setCalView]           = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [addMode, setAddMode]           = useState<{ month: number; day?: number } | null>(null)
  const [addEventMode, setAddEventMode] = useState<{ month: number; day?: number } | null>(null)
  const [detailModal, setDetailModal]   = useState<Race | null>(null)
  const [editModal, setEditModal]       = useState<Race | null>(null)
  const year = new Date().getFullYear()

  const gty      = races.find(r => r.level === 'gty')
  const nextRace = races.filter(r => daysUntil(r.date) > 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date))[0]
  const raceEvents = events.filter(e => e.category === 'race')

  function getRacesForMonth(m: number) {
    return races.filter(r => { const d = new Date(r.date); return d.getFullYear() === year && d.getMonth() === m })
  }
  function getEventsForMonth(m: number) {
    return raceEvents.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === m })
  }
  function getEventsForDay(ds: string) {
    return raceEvents.filter(e => e.date === ds)
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* GTY Banner */}
      {gty && (
        <div style={{ padding:'14px 18px',borderRadius:14,background:'var(--gty-bg)',border:'2px solid var(--gty-border)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' }}>
          <span style={{ fontSize:28 }}>⚫</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gty-text)',opacity:0.6,margin:'0 0 2px' }}>Goal of the Year</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:'var(--gty-text)',margin:'0 0 2px' }}>{gty.name}</p>
            {gty.goal && <p style={{ fontSize:12,color:'var(--gty-text)',opacity:0.7,margin:0 }}>🎯 {gty.goal}</p>}
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:30,fontWeight:800,color:'var(--gty-text)',margin:0,lineHeight:1 }}>{Math.max(0, daysUntil(gty.date))}</p>
            <p style={{ fontSize:10,color:'var(--gty-text)',opacity:0.6,margin:0 }}>jours restants</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8 }}>
        <div style={{ display:'flex',gap:5 }}>
          {([['year','Vue annuelle'],['month','Vue mensuelle']] as [CalView,string][]).map(([v, l]) => (
            <button key={v} onClick={() => setCalView(v)}
              style={{ padding:'6px 12px',borderRadius:9,border:'1px solid',borderColor:calView===v?'#00c8e0':'var(--border)',background:calView===v?'rgba(0,200,224,0.10)':'var(--bg-card)',color:calView===v?'#00c8e0':'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:calView===v?600:400 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display:'flex',gap:6 }}>
          <button onClick={() => setAddEventMode({ month: currentMonth })}
            style={{ padding:'6px 12px',borderRadius:9,background:'rgba(156,163,175,0.15)',border:'1px solid rgba(156,163,175,0.3)',color:'#9ca3af',fontSize:11,fontWeight:600,cursor:'pointer' }}>
            📅 Événement
          </button>
          <button onClick={() => setAddMode({ month: currentMonth })}
            style={{ padding:'6px 12px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>
            + Course
          </button>
        </div>
      </div>

      {/* Year view */}
      {calView === 'year' && (
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,minmax(150px,1fr))',gap:10,minWidth:580 }}>
            {MONTHS.map((_, mi) => {
              const mr = getRacesForMonth(mi)
              const me = getEventsForMonth(mi)
              const all = [
                ...mr.map(r => ({ key:r.id, date:new Date(r.date).getDate(), isRace:true as const, race:r })),
                ...me.map(e => ({ key:e.id, date:new Date(e.date).getDate(), isRace:false as const, event:e })),
              ].sort((a, b) => a.date - b.date)
              return (
                <div key={mi} onClick={() => { setCurrentMonth(mi); setCalView('month') }}
                  style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:12,boxShadow:'var(--shadow-card)',cursor:'pointer' }}>
                  <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 7px',color:all.length>0?'var(--text)':'var(--text-dim)' }}>{MONTH_SHORT[mi]}</p>
                  {all.length > 0 ? all.map(item => {
                    if (item.isRace) {
                      const cfg = RACE_CONFIG[item.race.level]
                      return (
                        <div key={item.key} onClick={e => { e.stopPropagation(); setDetailModal(item.race) }}
                          style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:7,background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer',marginBottom:4 }}>
                          <span style={{ fontSize:9 }}>{cfg.emoji}</span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:item.race.level==='gty'?'var(--gty-text)':cfg.color }}>{item.race.name}</p>
                            <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>{item.date} {MONTH_SHORT[mi]}</p>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div key={item.key}
                          style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:7,background:EVENT_CONFIG.bg,border:`1px solid ${EVENT_CONFIG.border}44`,marginBottom:4 }}>
                          <span style={{ fontSize:9 }}>{EVENT_CONFIG.emoji}</span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:10,fontWeight:500,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:EVENT_CONFIG.color }}>{item.event.title}</p>
                            <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>{item.date} {MONTH_SHORT[mi]}</p>
                          </div>
                        </div>
                      )
                    }
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
            <div style={{ display:'flex',gap:6 }}>
              <button onClick={() => setAddEventMode({ month: currentMonth })}
                style={{ padding:'5px 10px',borderRadius:8,background:'rgba(156,163,175,0.12)',border:'1px solid rgba(156,163,175,0.25)',color:'#9ca3af',fontSize:10,cursor:'pointer' }}>
                📅 Événement
              </button>
              <button onClick={() => setAddMode({ month: currentMonth })}
                style={{ padding:'5px 10px',borderRadius:8,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',fontSize:10,cursor:'pointer' }}>
                + Course
              </button>
            </div>
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
              const dr  = races.filter(r => r.date === ds)
              const de  = getEventsForDay(ds)
              const isToday = new Date().toDateString() === new Date(ds).toDateString()
              return (
                <div key={day} onClick={() => setAddMode({ month: currentMonth, day })}
                  style={{ minHeight:60,borderRadius:7,background:'var(--bg-card2)',border:`1px solid ${isToday?'#00c8e0':'var(--border)'}`,padding:'3px 4px',cursor:'pointer',display:'flex',flexDirection:'column',gap:1 }}>
                  <p style={{ fontSize:10,fontWeight:isToday?700:500,color:isToday?'#00c8e0':'var(--text-mid)',margin:0,textAlign:'right' }}>{day}</p>
                  {dr.map(r => { const cfg = RACE_CONFIG[r.level]; return (
                    <div key={r.id} onClick={e => { e.stopPropagation(); setDetailModal(r) }}
                      style={{ borderRadius:3,padding:'1px 3px',background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer' }}>
                      <p style={{ fontSize:7,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{cfg.emoji} {r.name}</p>
                    </div>
                  )})}
                  {de.map(ev => (
                    <div key={ev.id} style={{ borderRadius:3,padding:'1px 3px',background:EVENT_CONFIG.bg,border:`1px solid ${EVENT_CONFIG.border}44` }}>
                      <p style={{ fontSize:7,fontWeight:500,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:EVENT_CONFIG.color }}>{EVENT_CONFIG.emoji} {ev.title}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next race */}
      {nextRace && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:14,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 9px' }}>Prochaine course</p>
          <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
            <div style={{ width:52,height:52,borderRadius:11,background:RACE_CONFIG[nextRace.level].bg,border:`2px solid ${RACE_CONFIG[nextRace.level].border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <span style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:nextRace.level==='gty'?'var(--gty-text)':RACE_CONFIG[nextRace.level].color,lineHeight:1 }}>{daysUntil(nextRace.date)}</span>
              <span style={{ fontSize:7,color:'var(--text-dim)' }}>jours</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>{nextRace.name}</p>
              <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 4px' }}>{new Date(nextRace.date).toLocaleDateString('fr-FR',{ weekday:'long',day:'numeric',month:'long' })}</p>
              {nextRace.goal && <p style={{ fontSize:11,color:'var(--text-mid)',margin:0 }}>🎯 {nextRace.goal}</p>}
            </div>
            <button onClick={() => setEditModal(nextRace)}
              style={{ padding:'5px 10px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>
              Modifier
            </button>
          </div>
        </div>
      )}

      {/* All races list */}
      {races.length === 0 && events.filter(e => e.category === 'race').length === 0 && (
        <div style={{ padding:'32px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <p style={{ fontSize:32,marginBottom:8 }}>🏁</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 6px' }}>Aucune course planifiée</p>
          <button onClick={() => setAddMode({ month: currentMonth })}
            style={{ padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer' }}>
            + Ajouter une course
          </button>
        </div>
      )}

      {addMode      && <RaceAddModal month={addMode.month} day={addMode.day} year={year} onClose={() => setAddMode(null)} onSave={r => { addRace(r); setAddMode(null) }}/>}
      {addEventMode && <RaceEventModal month={addEventMode.month} day={addEventMode.day} year={year} onClose={() => setAddEventMode(null)} onSave={e => { addEvent(e); setAddEventMode(null) }}/>}
      {detailModal  && <RaceDetailModal race={detailModal} onClose={() => setDetailModal(null)} onDelete={id => { deleteRace(id); setDetailModal(null) }} onEdit={() => { setEditModal(detailModal); setDetailModal(null) }}/>}
      {editModal    && <RaceEditModal race={editModal} onClose={() => setEditModal(null)} onSave={r => { updateRace(r); setEditModal(null) }}/>}
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
            {CATEGORY_CONFIG[category].icon} Ajouter un événement {CATEGORY_CONFIG[category].label}
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
                        style={{ padding:'3px 6px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:10,cursor:'pointer' }}>✏️</button>
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
          <p style={{ fontSize:28,marginBottom:8 }}>{cfg.icon}</p>
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
// ALL TAB — TIMELINE
// ════════════════════════════════════════════════
function AllTab({ races, eventTypes, events }: { races: Race[]; eventTypes: CalEventType[]; events: CalEvent[] }) {
  const [mode, setMode] = useState<TimelineMode>('vertical')
  const year = new Date().getFullYear()

  // Build unified events list
  const allEvents: AnyEvent[] = [
    ...races.map(r => {
      const cfg = RACE_CONFIG[r.level]
      return {
        id: r.id, date: r.date, title: r.name, category: 'race' as const,
        color: r.level === 'gty' ? '#9ca3af' : cfg.color,
        label: cfg.label, subLabel: SPORT_EMOJI[r.sport],
      }
    }),
    ...events.map(e => {
      const t = eventTypes.find(t => t.id === e.typeId)
      const col = e.color ?? t?.color ?? CATEGORY_CONFIG[e.category as 'pro'|'perso']?.color ?? '#6b7280'
      const catCfg = CATEGORY_CONFIG[e.category as 'race'|'pro'|'perso']
      return {
        id: e.id, date: e.date, title: e.title, category: e.category,
        color: col, label: t?.name ?? catCfg?.label ?? e.category,
        subLabel: catCfg?.icon,
      }
    }),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date().toISOString().split('T')[0]

  // Group by month
  const byMonth: Record<number, AnyEvent[]> = {}
  allEvents.forEach(e => {
    const m = new Date(e.date).getMonth()
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(e)
  })

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Toggle horizontal/vertical — desktop only */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8 }}>
        <div>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0 }}>Vue globale {year}</p>
          <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>{allEvents.length} événement(s) — Race · Pro · Perso</p>
        </div>
        <div id="all-toggle-desktop" style={{ display:'flex',gap:5 }}>
          {(['vertical','horizontal'] as TimelineMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding:'6px 12px',borderRadius:9,border:'1px solid',borderColor:mode===m?'#00c8e0':'var(--border)',background:mode===m?'rgba(0,200,224,0.10)':'var(--bg-card)',color:mode===m?'#00c8e0':'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:mode===m?600:400 }}>
              {m === 'vertical' ? '↕ Vertical' : '↔ Horizontal'}
            </button>
          ))}
        </div>
      </div>

      {allEvents.length === 0 && (
        <div style={{ padding:'32px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <p style={{ fontSize:32,marginBottom:8 }}>🗓</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 6px' }}>Aucun événement</p>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:0 }}>Ajoutez des courses, événements pro ou perso</p>
        </div>
      )}

      {/* Vertical timeline */}
      {(mode === 'vertical') && allEvents.length > 0 && (
        <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
          {MONTHS.map((monthName, mi) => {
            const mEvents = byMonth[mi] ?? []
            if (mEvents.length === 0) return null
            return (
              <div key={mi} style={{ display:'flex',gap:0 }}>
                {/* Month column */}
                <div style={{ width:52,flexShrink:0,paddingTop:6,display:'flex',flexDirection:'column',alignItems:'center' }}>
                  <div style={{ width:1,flex:1,background:'var(--border)',marginTop:4 }}/>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--border)',margin:'-4px 0',zIndex:1,flexShrink:0 }}/>
                  <div style={{ width:1,flex:1,background:'var(--border)' }}/>
                </div>
                <div style={{ flex:1,paddingBottom:16 }}>
                  <p style={{ fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,color:'var(--text-dim)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.08em' }}>{MONTH_SHORT[mi]}</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {mEvents.map(ev => {
                      const isPast = ev.date < today
                      const catCfg = CATEGORY_CONFIG[ev.category]
                      return (
                        <div key={ev.id}
                          style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:isPast?'var(--bg-card2)':`${ev.color}12`,border:`1px solid ${isPast?'var(--border)':ev.color+'33'}`,opacity:isPast?0.65:1 }}>
                          {/* Category badge */}
                          <div style={{ width:6,height:6,borderRadius:'50%',background:ev.color,flexShrink:0 }}/>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:1 }}>
                              <span style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:catCfg?.color??'var(--text-dim)',padding:'1px 5px',borderRadius:4,background:`${catCfg?.color ?? '#6b7280'}18` }}>
                                {catCfg?.icon} {catCfg?.label}
                              </span>
                              <span style={{ fontSize:9,color:'var(--text-dim)' }}>{ev.label}</span>
                              {ev.subLabel && <span style={{ fontSize:10 }}>{ev.subLabel}</span>}
                            </div>
                            <p style={{ fontSize:13,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.title}</p>
                          </div>
                          <div style={{ textAlign:'right',flexShrink:0 }}>
                            <p style={{ fontFamily:'Syne,sans-serif',fontSize:isPast?11:18,fontWeight:700,color:isPast?'var(--text-dim)':ev.color,margin:0,lineHeight:1 }}>
                              {isPast ? '✓' : daysUntil(ev.date)}
                            </p>
                            <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0' }}>
                              {isPast ? 'Passé' : 'jours'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Horizontal timeline — desktop only */}
      {mode === 'horizontal' && allEvents.length > 0 && (
        <div id="all-horizontal" style={{ overflowX:'auto',paddingBottom:12 }}>
          <div style={{ minWidth: Math.max(900, allEvents.length * 80), position:'relative',paddingTop:50,paddingBottom:20 }}>
            {/* Month axis */}
            <div style={{ display:'flex',position:'relative',marginBottom:32 }}>
              {MONTHS.map((_, mi) => {
                const hasEvents = (byMonth[mi] ?? []).length > 0
                const xPct = (mi / 12) * 100
                return (
                  <div key={mi} style={{ flex:1,textAlign:'center',position:'relative' }}>
                    <div style={{ position:'absolute',top:14,left:0,right:0,height:1,background:'var(--border)',zIndex:0 }}/>
                    <div style={{ position:'relative',zIndex:1 }}>
                      <div style={{ width:hasEvents?10:6,height:hasEvents?10:6,borderRadius:'50%',background:hasEvents?'#00c8e0':'var(--border)',margin:'0 auto 4px' }}/>
                      <p style={{ fontSize:9,fontWeight:hasEvents?700:400,color:hasEvents?'var(--text)':'var(--text-dim)',margin:0 }}>{MONTH_SHORT[mi]}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Events stacked by lane */}
            {MONTHS.map((_, mi) => {
              const mEvents = byMonth[mi] ?? []
              if (mEvents.length === 0) return null
              return (
                <div key={mi} style={{ position:'absolute', left:`${(mi / 12) * 100}%`, top:60, transform:'translateX(-50%)', display:'flex', flexDirection:'column', gap:5, width:140, zIndex:2 }}>
                  {mEvents.map(ev => {
                    const isPast = ev.date < today
                    const catCfg = CATEGORY_CONFIG[ev.category]
                    const day = new Date(ev.date).getDate()
                    return (
                      <div key={ev.id}
                        style={{ padding:'8px 10px',borderRadius:9,background:isPast?'var(--bg-card2)':`${ev.color}15`,border:`1px solid ${isPast?'var(--border)':ev.color+'44'}`,opacity:isPast?0.6:1 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:3 }}>
                          <div style={{ width:6,height:6,borderRadius:'50%',background:ev.color,flexShrink:0 }}/>
                          <span style={{ fontSize:8,color:catCfg?.color??'var(--text-dim)',fontWeight:700 }}>{catCfg?.icon} {catCfg?.label}</span>
                          <span style={{ fontSize:8,color:'var(--text-dim)',marginLeft:'auto' }}>{day} {MONTH_SHORT[mi]}</span>
                        </div>
                        <p style={{ fontSize:11,fontWeight:600,margin:0,color:ev.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.title}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          #all-toggle-desktop { display: none !important; }
          #all-horizontal     { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function CalendarPage() {
  const [tab, setTab] = useState<CalTab>('race')
  const { races, eventTypes, events, loading, addRace, updateRace, deleteRace, addEventType, updateEventType, deleteEventType, addEvent, updateEvent, deleteEvent } = useCalendar()

  const TABS: { id: CalTab; label: string; short: string; color: string; bg: string }[] = [
    { id:'race',  label:'Race',  short:'Race',  color:'#ef4444', bg:'rgba(239,68,68,0.10)'  },
    { id:'pro',   label:'Pro',   short:'Pro',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)' },
    { id:'perso', label:'Perso', short:'Perso', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
    { id:'all',   label:'All',   short:'All',   color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
  ]

  return (
    <div style={{ padding:'24px 28px',maxWidth:'100%' }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Calendar</h1>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>Race · Pro · Perso · Vue globale</p>
      </div>

      {/* Tab pills */}
      <div style={{ display:'flex',gap:7,marginBottom:20,flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 20px',borderRadius:50,border:'1px solid',cursor:'pointer',transition:'all 0.15s',
              borderColor: tab === t.id ? t.color : 'var(--border)',
              background:  tab === t.id ? t.color : 'transparent',
              color:       tab === t.id ? '#fff'  : 'var(--text-mid)',
              fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:tab===t.id?600:400,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding:'40px',textAlign:'center',color:'var(--text-dim)',fontSize:13 }}>Chargement…</div>
      )}

      {!loading && (
        <>
          {tab === 'race'  && <RaceTab races={races} events={events} addRace={addRace} updateRace={updateRace} deleteRace={deleteRace} addEvent={addEvent} deleteEvent={deleteEvent}/>}
          {tab === 'pro'   && <CategoryTab category="pro"   eventTypes={eventTypes} events={events} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} addEvent={addEvent} deleteEvent={deleteEvent}/>}
          {tab === 'perso' && <CategoryTab category="perso" eventTypes={eventTypes} events={events} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} addEvent={addEvent} deleteEvent={deleteEvent}/>}
          {tab === 'all'   && <AllTab races={races} eventTypes={eventTypes} events={events}/>}
        </>
      )}
    </div>
  )
}
