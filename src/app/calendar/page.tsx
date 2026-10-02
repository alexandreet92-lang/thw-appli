'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import GoalBanner from './components/GoalBanner'
import NextRaceBar from './components/NextRaceBar'
import YearGridView from './components/YearGridView'
import MonthPageView from './components/MonthPageView'
import YearPickerSheet from './components/YearPickerSheet'
import RaceModal from './components/RaceModal'
import EventModal from './components/EventModal'
import TestEditorSheet, { type PlannedTestInput } from './components/TestEditorSheet'
import { findCatalogTest } from '@/lib/tests/catalog'
import type { RaceStage, NutritionItem, StageSport } from './components/types'
import { sanitizeFileName } from '@/lib/utils'

// Sérialisation du programme de stage dans le JSONB daily_program (zéro migration).
// Nouveau format : { sports, days } ; rétrocompat : ancien format = tableau de jours.
function parseStageProgram(raw: unknown): { sports: StageSport[]; days: RaceStage['dailyProgram'] } {
  if (Array.isArray(raw)) return { sports: [], days: raw as RaceStage['dailyProgram'] }
  if (raw && typeof raw === 'object') {
    const o = raw as { sports?: StageSport[]; days?: RaceStage['dailyProgram'] }
    return { sports: o.sports ?? [], days: o.days ?? [] }
  }
  return { sports: [], days: [] }
}
function serializeStageProgram(s: { sports?: StageSport[]; dailyProgram: RaceStage['dailyProgram'] }) {
  return { sports: s.sports ?? [], days: s.dailyProgram }
}
const mondayOf = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00'); const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow); return d.toISOString().split('T')[0]
}
const dowOf = (dateStr: string): number => (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7
const STAGE_PLANNING_SPORT: Record<StageSport, string> = {
  run: 'run', trail: 'run', bike: 'bike', swim: 'swim', hyrox: 'hyrox', rowing: 'rowing', muscu: 'gym',
}
const STAGE_SPORT_LABEL: Record<StageSport, string> = {
  run: 'Running', trail: 'Trail', bike: 'Cyclisme', swim: 'Natation', hyrox: 'Hyrox', rowing: 'Aviron', muscu: 'Muscu',
}
import ClockView, { type ClockEvent } from './components/ClockView'
import DayModal from './components/DayModal'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { CALENDAR_ONBOARDING } from '@/onboarding/configs/calendar.config'
import { Trophy, Briefcase, Heart, LayoutGrid, CalendarDays, Target, PartyPopper } from 'lucide-react'
import { SectionLayout } from '@/components/navigation/SectionLayout'
import { useI18n, currentLocale } from '@/lib/i18n'
import { useGuideTabDemo } from '@/components/guide/guideDemo'
import { useNarrow } from '@/lib/hooks/useNarrow'
import { MSheet, SheetHeader, Group, GroupRow, IconTile, TILE, PAGE_BG } from '@/components/ai/mobile/MobileKit'
import { useIsMobile, FormMProvider, MSection, MField, MDot, MDangerRow, MSeg, M_SCROLL, M_INP, M_TEXTAREA } from './components/mobileForm'
type CalView       = 'year' | 'month'
type TimelineMode  = 'vertical' | 'horizontal'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty' | 'event'
type RaceSport     = 'run' | 'trail' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
type SportType     = 'run' | 'trail' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing' | 'gym'

interface Race {
  id: string; name: string; sport: RaceSport; date: string; level: RaceLevel
  endDate?: string   // Événement/Défi multi-jours
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

type Importance = 'normal' | 'important' | 'primordial'
interface CalEvent {
  id: string; category: 'race' | 'pro' | 'perso' | 'test'
  typeId?: string; date: string; title: string; description?: string; color?: string
  ref?: string | null   // 'test' : slug du test Performance lié
  importance?: Importance   // pro/perso : niveau → teinte (bleu pour pro, violet pour perso)
  done?: boolean            // pro/perso : objectif Fait / Pas fait
}

// Dégradé de teinte par importance : bleu pour les objectifs Pro, violet pour les Perso.
const IMPORTANCE_SHADES: Record<'pro' | 'perso', Record<Importance, string>> = {
  pro:   { normal: '#93c5fd', important: '#3b82f6', primordial: '#1e40af' },
  perso: { normal: '#c4b5fd', important: '#a855f7', primordial: '#6b21a8' },
}
const IMPORTANCE_LABEL_KEY: Record<Importance, string> = {
  normal: 'calendar.impNormal', important: 'calendar.impImportant', primordial: 'calendar.impPrimordial',
}
function eventShade(category: 'pro' | 'perso', importance?: Importance): string {
  return IMPORTANCE_SHADES[category][importance ?? 'normal']
}

// Combined event for All view
interface AnyEvent {
  id: string; date: string; title: string
  category: 'race' | 'pro' | 'perso'; color: string; label: string
  subLabel?: string
}

// ── Constants ─────────────────────────────────────
// Libellés de mois : voir les clés i18n `lo.month*` / `lo.monthShort*`
// (tableaux localisés construits dans chaque composant via useI18n).

const SPORT_BG: Record<SportType, string> = {
  swim:'rgba(56,189,248,0.13)', run:'rgba(34,197,94,0.13)', trail:'rgba(132,204,22,0.13)', bike:'rgba(59,130,246,0.13)',
  hyrox:'rgba(239,68,68,0.13)', gym:'rgba(249,115,22,0.13)',
  triathlon:'rgba(168,85,247,0.13)', rowing:'rgba(20,184,166,0.13)',
}
const SPORT_BORDER: Record<SportType, string> = {
  swim:'#38bdf8', run:'#22c55e', trail:'#84cc16', bike:'#3b82f6',
  hyrox:'#ef4444', gym:'#f97316', triathlon:'#a855f7', rowing:'#14b8a6',
}

const RACE_CONFIG: Record<RaceLevel, { label: string; color: string; bg: string; border: string }> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444' },
  gty:       { label:'GTY', color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)' },
  event:     { label:'Événement', color:'#ec4899', bg:'rgba(236,72,153,0.12)', border:'#ec4899' },
}

const EVENT_CONFIG = { label:'Événement', color:'#ec4899', bg:'rgba(236,72,153,0.12)', border:'#ec4899' }

const CATEGORY_CONFIG = {
  race:  { label:'Race',  color:'#ef4444', bg:'rgba(239,68,68,0.10)'  },
  pro:   { label:'Pro',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)' },
  perso: { label:'Perso', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
}

// Clés i18n pour les libellés (les configs ci-dessus gardent les couleurs).
const RACE_LEVEL_KEY: Record<RaceLevel, string> = {
  secondary: 'calendar.prioSecondary', important: 'calendar.prioImportant',
  main: 'calendar.prioMain', gty: 'calendar.levelGty', event: 'calendar.prioEvent',
}
const CATEGORY_LABEL_KEY: Record<'race' | 'pro' | 'perso', string> = {
  race: 'calendar.catRace', pro: 'calendar.catPro', perso: 'calendar.catPerso',
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
    const uid = await resolvePlanningUid(supabase)
    if (!uid) { setLoading(false); return }

    const [r, rs, et, ev] = await Promise.all([
      supabase.from('planned_races').select('*').eq('user_id', uid).order('date'),
      supabase.from('race_events').select('*').eq('user_id', uid).order('start_date'),
      supabase.from('calendar_event_types').select('*').eq('user_id', uid).order('name'),
      supabase.from('calendar_events').select('*').eq('user_id', uid).order('date'),
    ])

    setRaces((r.data ?? []).map((x: Record<string, unknown>): Race => ({
      id: x.id as string, name: x.name as string,
      sport: x.sport as RaceSport, date: x.date as string, level: x.level as RaceLevel,
      endDate: (x.end_date as string | null | undefined) ?? undefined,
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

    setRaceStages((rs.data ?? []).map((x: Record<string, unknown>): RaceStage => {
      const prog = parseStageProgram(x.daily_program)
      return {
        id: x.id as string, name: x.name as string,
        startDate: x.start_date as string, endDate: x.end_date as string,
        description: x.description as string | undefined,
        sports: prog.sports,
        dailyProgram: prog.days,
      }
    }))

    setEventTypes((et.data ?? []).map((x: Record<string, unknown>): CalEventType => ({
      id: x.id as string, name: x.name as string, color: x.color as string,
      category: x.category as 'pro' | 'perso',
    })))

    setEvents((ev.data ?? []).map((x: Record<string, unknown>): CalEvent => ({
      id: x.id as string, category: x.category as 'race' | 'pro' | 'perso' | 'test',
      typeId: x.type_id as string | undefined,
      date: x.date as string, title: x.title as string,
      description: x.description as string | undefined,
      color: x.color as string | undefined,
      ref: (x.ref as string | null | undefined) ?? null,
      importance: (x.importance as Importance | undefined) ?? 'normal',
      done: (x.done as boolean | undefined) ?? false,
    })))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Race CRUD ──────────────────────────────────
  async function addRace(r: Omit<Race, 'id' | 'validated' | 'validationData'>): Promise<string | null> {
    const uid = await resolvePlanningUid(supabase); if (!uid) return null
    const { data, error } = await supabase.from('planned_races').insert({
      user_id: uid, name: r.name, sport: r.sport, date: r.date, level: r.level,
      end_date: r.endDate ?? null,
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
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    const allFiles: { file: File; label?: string }[] = [
      ...files.map(f => ({ file: f })),
      ...(filesBike ?? []).map(f => ({ file: f, label: 'Parcours vélo' })),
      ...(filesRun  ?? []).map(f => ({ file: f, label: 'Parcours run' })),
    ]
    for (const { file, label } of allFiles) {
      try {
        const safeName = sanitizeFileName(file.name)
        const path = `${uid}/${raceId}/${safeName}`
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

  // Édition d'une course : met à jour la course PUIS enregistre les parcours
  // nouvellement déposés (l'ancienne version ignorait totalement les fichiers en
  // édition → le parcours ne s'enregistrait jamais). Un créneau (route générale,
  // vélo, run) est remplacé uniquement si un nouveau fichier est fourni.
  async function updateRaceWithFiles(
    r: Race,
    files: File[], filesBike?: File[], filesRun?: File[],
  ) {
    await updateRace(r)
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    const groups: { list: File[]; label: string | null }[] = [
      { list: files,           label: null },
      { list: filesBike ?? [], label: 'Parcours vélo' },
      { list: filesRun  ?? [], label: 'Parcours run' },
    ]
    for (const { list, label } of groups) {
      if (list.length === 0) continue
      // Remplace le parcours existant de ce créneau avant de réinsérer.
      const del = supabase.from('race_files').delete().eq('race_id', r.id)
      await (label === null ? del.is('label', null) : del.eq('label', label))
      for (const file of list) {
        try {
          const safeName = sanitizeFileName(file.name)
          const path = `${uid}/${r.id}/${safeName}`
          const { data: upData, error: upErr } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
          if (upErr) { console.error('[updateRaceWithFiles] storage upload error', upErr); continue }
          if (!upData) { console.error('[updateRaceWithFiles] storage upload returned no data'); continue }
          const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
          const { error: insErr } = await supabase.from('race_files').insert({
            race_id: r.id, file_url: urlData.publicUrl,
            file_name: file.name, file_type: file.type, label,
          })
          if (insErr) console.error('[updateRaceWithFiles] race_files insert error', insErr)
        } catch (e) { console.error('[updateRaceWithFiles file]', e) }
      }
    }
  }

  async function markCompleted(id: string) {
    await supabase.from('planned_races').update({
      status: 'completed', updated_at: new Date().toISOString(),
    }).eq('id', id)
    setRaces(p => p.map(x => x.id === id ? { ...x, status: 'completed' as const } : x))
  }

  // ── RaceStage CRUD ─────────────────────────────
  async function addRaceStage(s: Omit<RaceStage, 'id'>, dayFiles: { date: string; file: File }[]) {
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    console.log('[addRaceStage] inserting event', s.name, 'dayFiles:', dayFiles.length)
    const { data, error } = await supabase.from('race_events').insert({
      user_id: uid, name: s.name, start_date: s.startDate, end_date: s.endDate,
      description: s.description ?? null, daily_program: serializeStageProgram(s),
    }).select().single()
    if (error) { console.error('[addRaceStage] insert error', error); return }
    if (!data) { console.error('[addRaceStage] no data returned'); return }
    const row = data as Record<string, unknown>
    const stageId = row.id as string
    console.log('[addRaceStage] event created, stageId:', stageId)
    for (const { date, file } of dayFiles) {
      try {
        console.log('[addRaceStage] uploading file for', date, file.name)
        const path = `${uid}/events/${stageId}/${date}/${sanitizeFileName(file.name)}`
        const { data: upData, error: upErr } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
        if (upErr) { console.error('[addRaceStage] storage upload error', upErr); continue }
        if (!upData) { console.error('[addRaceStage] storage upload returned no data'); continue }
        const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
        console.log('[addRaceStage] file uploaded, url:', urlData.publicUrl)
        const { error: insErr } = await supabase.from('race_event_files').insert({
          event_id: stageId, file_url: urlData.publicUrl, file_name: file.name, event_date: date,
        })
        if (insErr) console.error('[addRaceStage] race_event_files insert error', insErr)
        else console.log('[addRaceStage] race_event_files row inserted for', date)
      } catch (e) { console.error('[addRaceStage] file upload exception', e) }
    }
    setRaceStages(p => [...p, { ...s, id: stageId }])
    await addStageSessionsToPlanning(stageId, s)
    console.log('[addRaceStage] done')
  }

  async function saveStageDayContent(stageId: string, date: string, content: string, file?: File) {
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    // Update daily_program for this day only
    const stage = raceStages.find(s => s.id === stageId)
    if (!stage) return
    const updatedProgram = stage.dailyProgram.map(d =>
      d.date === date ? { ...d, content } : d,
    )
    if (!updatedProgram.find(d => d.date === date)) {
      updatedProgram.push({ date, content })
    }
    await supabase.from('race_events').update({ daily_program: serializeStageProgram({ sports: stage.sports, dailyProgram: updatedProgram }) }).eq('id', stageId)
    setRaceStages(p => p.map(s => s.id === stageId ? { ...s, dailyProgram: updatedProgram } : s))

    if (file) {
      try {
        const path = `${uid}/events/${stageId}/${date}/${sanitizeFileName(file.name)}`
        const { data: upData } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
        if (upData) {
          const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
          // Upsert: delete old file record for this day first
          await supabase.from('race_event_files')
            .delete().eq('event_id', stageId).eq('event_date', date)
          await supabase.from('race_event_files').insert({
            event_id: stageId, file_url: urlData.publicUrl, file_name: file.name, event_date: date,
          })
        }
      } catch (e) { console.error('[saveStageDayContent file]', e) }
    }
  }

  async function updateRaceStage(s: RaceStage, dayFiles: { date: string; file: File }[]) {
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    console.log('[updateRaceStage] updating event', s.id, s.name, 'dayFiles:', dayFiles.length)
    const { error: upErr } = await supabase.from('race_events').update({
      name: s.name, start_date: s.startDate, end_date: s.endDate,
      description: s.description ?? null, daily_program: serializeStageProgram(s),
    }).eq('id', s.id)
    if (upErr) console.error('[updateRaceStage] update error', upErr)
    for (const { date, file } of dayFiles) {
      try {
        console.log('[updateRaceStage] uploading file for', date, file.name, '(event_id:', s.id, ')')
        const path = `${uid}/events/${s.id}/${date}/${sanitizeFileName(file.name)}`
        const { data: storData, error: storErr } = await supabase.storage.from('race-files').upload(path, file, { upsert: true })
        if (storErr) { console.error('[updateRaceStage] storage upload error', storErr); continue }
        if (!storData) { console.error('[updateRaceStage] storage upload returned no data'); continue }
        const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
        console.log('[updateRaceStage] file uploaded, url:', urlData.publicUrl)
        // Upsert: delete old record for this date first
        await supabase.from('race_event_files').delete().eq('event_id', s.id).eq('event_date', date)
        const { error: insErr } = await supabase.from('race_event_files').insert({
          event_id: s.id, file_url: urlData.publicUrl, file_name: file.name, event_date: date,
        })
        if (insErr) console.error('[updateRaceStage] race_event_files insert error', insErr)
        else console.log('[updateRaceStage] race_event_files row upserted for', date)
      } catch (e) { console.error('[updateRaceStage] file upload exception', e) }
    }
    setRaceStages(p => p.map(x => x.id === s.id ? s : x))
    await addStageSessionsToPlanning(s.id, s)
    console.log('[updateRaceStage] done')
  }

  async function updateRace(r: Race) {
    const { error } = await supabase.from('planned_races').update({
      name: r.name, sport: r.sport, date: r.date, level: r.level,
      end_date: r.endDate ?? null,
      goal: r.goal ?? null, strategy: r.strategy ?? null,
      run_distance: r.runDistance ?? null, tri_distance: r.triDistance ?? null,
      hyrox_category: r.hyroxCategory ?? null, hyrox_level: r.hyroxLevel ?? null,
      hyrox_gender: r.hyroxGender ?? null, goal_time: r.goalTime ?? null,
      goal_swim_time: r.goalSwimTime ?? null, goal_bike_time: r.goalBikeTime ?? null,
      goal_run_time: r.goalRunTime ?? null,
      status: r.status ?? 'upcoming', distance: r.distance ?? null,
      performance_data: r.performanceData ?? {}, notes: r.notes ?? null,
      validated: r.validated ?? false, validation_data: r.validationData ?? {},
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    if (error) { console.error('[updateRace] update error', error); throw error }
    setRaces(p => p.map(x => x.id === r.id ? r : x))
  }

  async function deleteRace(id: string) {
    await supabase.from('planned_races').delete().eq('id', id)
    setRaces(p => p.filter(x => x.id !== id))
  }

  // ── EventType CRUD ─────────────────────────────
  async function addEventType(t: Omit<CalEventType, 'id'>) {
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    const { data, error } = await supabase.from('calendar_event_types').insert({
      user_id: uid, name: t.name, color: t.color, category: t.category,
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
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    const { data, error } = await supabase.from('calendar_events').insert({
      user_id: uid, category: e.category, type_id: e.typeId ?? null,
      date: e.date, title: e.title, description: e.description ?? null, color: e.color ?? null,
      ref: e.ref ?? null, importance: e.importance ?? 'normal', done: e.done ?? false,
    }).select().single()
    if (!error && data) setEvents(p => [...p, { ...e, id: data.id }])
  }

  async function updateEvent(e: CalEvent) {
    await supabase.from('calendar_events').update({
      type_id: e.typeId ?? null, date: e.date, title: e.title,
      description: e.description ?? null, color: e.color ?? null, ref: e.ref ?? null,
      importance: e.importance ?? 'normal', done: e.done ?? false,
      updated_at: new Date().toISOString(),
    }).eq('id', e.id)
    setEvents(p => p.map(x => x.id === e.id ? e : x))
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(p => p.filter(x => x.id !== id))
  }

  function patchStageDayLocal(stageId: string, date: string, content: string) {
    setRaceStages(prev => prev.map(s => {
      if (s.id !== stageId) return s
      const dp = s.dailyProgram.some(p => p.date === date)
        ? s.dailyProgram.map(p => p.date === date ? { ...p, content } : p)
        : [...s.dailyProgram, { date, content }]
      return { ...s, dailyProgram: dp }
    }))
  }

  function deleteStageDayLocal(stageId: string, date: string) {
    setRaceStages(prev => prev.map(s => {
      if (s.id !== stageId) return s
      return { ...s, dailyProgram: s.dailyProgram.filter(p => p.date !== date) }
    }))
  }

  async function deleteRaceStage(id: string) {
    await supabase.from('race_events').delete().eq('id', id)
    setRaceStages(p => p.filter(s => s.id !== id))
  }

  // Push auto des séances structurées d'un stage dans le planning. Idempotent :
  // retire les séances déjà générées par CE stage (source_event_id) puis réinsère
  // avec le même titre + parcours. Appelé à la création ET à la modification.
  async function addStageSessionsToPlanning(stageId: string, stage: { name: string; dailyProgram: RaceStage['dailyProgram'] }) {
    const uid = await resolvePlanningUid(supabase); if (!uid) return
    const rows: Record<string, unknown>[] = []
    for (const day of stage.dailyProgram) {
      for (const slot of ['matin', 'aprem'] as const) {
        for (const ses of day[slot] ?? []) {
          if (!ses.title?.trim() && !ses.detail?.trim() && !ses.sport) continue
          rows.push({
            user_id: uid, week_start: mondayOf(day.date), day_index: dowOf(day.date),
            sport: STAGE_PLANNING_SPORT[ses.sport] ?? 'run',
            title: ses.title?.trim() || `${stage.name} — ${ses.detail?.trim() || STAGE_SPORT_LABEL[ses.sport]}`,
            time: ses.time || (slot === 'matin' ? '09:00' : '15:00'),
            duration_min: 60, status: 'planned', notes: ses.detail?.trim() || null,
            blocks: [], validation_data: {},
            parcours_data: day.parcours ?? null,
            source_event_id: stageId, source_event_date: day.date,
          })
        }
      }
    }
    await supabase.from('planned_sessions').delete().eq('user_id', uid).eq('source_event_id', stageId)
    if (rows.length) await supabase.from('planned_sessions').insert(rows)
  }

  return {
    races, raceStages, eventTypes, events, loading,
    addRace, addRaceWithFiles, updateRaceWithFiles, updateRace, deleteRace, markCompleted,
    addRaceStage, updateRaceStage, deleteRaceStage,
    saveStageDayContent, patchStageDayLocal, deleteStageDayLocal,
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
  const { t } = useI18n()
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
  const RACE_SPORTS: RaceSport[] = ['run','trail','bike','swim','hyrox','triathlon','rowing']
  const RSL: Record<RaceSport, string> = { run:'sport.running',trail:'sport.trail',bike:'sport.cycling',swim:'q.sport.natation',hyrox:'sport.hyrox',triathlon:'sport.triathlon',rowing:'sport.aviron' }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius: 'var(--r-lg)',border:'1px solid var(--border-mid)',padding:22,maxWidth:500,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily: 'var(--font-body)',fontSize:15,fontWeight:700,margin:0 }}>{t('calendar.addRace')}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>{t('calendar.sport')}</p>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:14 }}>
          {RACE_SPORTS.map(s => (
            <button key={s} onClick={() => { setSport(s); setHyroxCat(''); setHyroxLvl(''); setHyroxGen('') }}
              style={{ padding:'5px 9px',borderRadius: 'var(--r-sm)',border:'1px solid',borderColor:sport===s?SPORT_BORDER[s as SportType]:'var(--border)',background:sport===s?SPORT_BG[s as SportType]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s as SportType]:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>
              {t(RSL[s])}
            </button>
          ))}
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>{t('calendar.level')}</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14 }}>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(l => {
            const cfg = RACE_CONFIG[l]
            return (
              <button key={l} onClick={() => setLevel(l)}
                style={{ padding:'8px 10px',borderRadius: 'var(--r-sm)',border:'1px solid',cursor:'pointer',textAlign:'left',borderColor:level===l?cfg.border:'var(--border)',background:level===l?cfg.bg:'var(--bg-card2)' }}>
                <p style={{ fontSize:11,fontWeight:600,margin:0,color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.label}</p>
              </button>
            )
          })}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:9,marginBottom:12 }}>
          <div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.name')}</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('calendar.namePhIronman')}
              style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
          <div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.date')}</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width:'100%',padding:'7px 9px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
        </div>
        {sport === 'run' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>{t('calendar.distance')}</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:8 }}>
              {RUN_DISTANCES.map(d => (
                <button key={d} onClick={() => setRunDist(d)} style={{ padding:'5px 10px',borderRadius: 'var(--r-sm)',border:'1px solid',borderColor:runDist===d?'#22c55e':'var(--border)',background:runDist===d?'rgba(34,197,94,0.10)':'var(--bg-card2)',color:runDist===d?'#22c55e':'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{d}</button>
              ))}
            </div>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.goalTime')}</p>
            <input value={goalTime} onChange={e => setGoalTime(e.target.value)} placeholder={t('calendar.goalTimePh')}
              style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily: 'var(--font-body)',fontSize:12,outline:'none' }}/>
          </div>
        )}
        {sport === 'triathlon' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>{t('calendar.distance')}</p>
            <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:10 }}>
              {TRI_DISTANCES.map(d => (
                <button key={d} onClick={() => setTriDist(d)} style={{ padding:'8px 12px',borderRadius: 'var(--r-sm)',border:'1px solid',borderColor:triDist===d?'#a855f7':'var(--border)',background:triDist===d?'rgba(168,85,247,0.10)':'var(--bg-card2)',cursor:'pointer',textAlign:'left' }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:triDist===d?'#a855f7':'var(--text)' }}>{d}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{t('calendar.abbrNat')} {TRI_SWIM[d]} · {t('calendar.triBike')} {TRI_BIKE[d]} · {t('calendar.triRun')} {TRI_RUN[d]}</p>
                </button>
              ))}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {[{l:'q.sport.natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'calendar.triBike',v:goalBike,s:setGoalBike,p:'2h25'},{l:'calendar.triRun',v:goalRun,s:setGoalRun,p:'1h35'},{l:'calendar.triTotal',v:goalTime,s:setGoalTime,p:'4h40'}].map(x => (
                <div key={x.l}>
                  <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>{t(x.l)}</p>
                  <input value={x.v} onChange={e => x.s(e.target.value)} placeholder={x.p}
                    style={{ width:'100%',padding:'6px 8px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily: 'var(--font-body)',fontSize:11,outline:'none' }}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {!['run','triathlon','hyrox'].includes(sport) && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.objective')}</p>
            <input value={goalTime} onChange={e => setGoalTime(e.target.value)} placeholder={t('calendar.goalPhPodium')}
              style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
          </div>
        )}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{t('calendar.cancel')}</button>
          <button onClick={() => onSave({ name:name||'Course',sport,date,level,goal:goalTime||undefined,runDistance:sport==='run'?runDist:undefined,triDistance:sport==='triathlon'?triDist:undefined,hyroxCategory:hyroxCat||undefined,hyroxLevel:hyroxLvl||undefined,hyroxGender:hyroxGen||undefined,goalTime:goalTime||undefined,goalSwimTime:goalSwim||undefined,goalBikeTime:goalBike||undefined,goalRunTime:goalRun||undefined })}
            style={{ flex:2,padding:10,borderRadius: 'var(--r-sm)',background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            {t('calendar.addPlus')}
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceEditModal({ race, onClose, onSave }: { race: Race; onClose: () => void; onSave: (r: Race) => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState<Race>({ ...race })
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius: 'var(--r-lg)',border:'1px solid var(--border-mid)',padding:22,maxWidth:440,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily: 'var(--font-body)',fontSize:15,fontWeight:700,margin:0 }}>{t('calendar.editRace')}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.name')}</p>
          <input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.date')}</p>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6 }}>{t('calendar.level')}</p>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {(['secondary','important','main','gty'] as RaceLevel[]).map(l => {
              const cfg = RACE_CONFIG[l]
              return (
                <button key={l} onClick={() => setForm({ ...form, level:l })}
                  style={{ padding:'4px 9px',borderRadius: 'var(--r-sm)',border:'1px solid',borderColor:form.level===l?cfg.border:'var(--border)',background:form.level===l?cfg.bg:'var(--bg-card2)',color:form.level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text-mid)',fontSize:10,cursor:'pointer',fontWeight:form.level===l?700:400 }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.objective')}</p>
          <input value={form.goal ?? ''} onChange={e => setForm({ ...form, goal:e.target.value })}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.strategy')}</p>
          <textarea value={form.strategy ?? ''} onChange={e => setForm({ ...form, strategy:e.target.value })} rows={2}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' }}/>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{t('calendar.cancel')}</button>
          <button onClick={() => onSave(form)}
            style={{ flex:2,padding:10,borderRadius: 'var(--r-sm)',background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            {t('calendar.saveRace')}
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({ race, onClose, onDelete, onEdit }: {
  race: Race; onClose: () => void; onDelete: (id: string) => void; onEdit: () => void
}) {
  const { t } = useI18n()
  const cfg  = RACE_CONFIG[race.level]
  const days = daysUntil(race.date)
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius: 'var(--r-lg)',border:'1px solid var(--border-mid)',padding:22,maxWidth:460,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14 }}>
          <div>
            <span style={{ padding:'2px 8px',borderRadius: 'var(--r-lg)',background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'var(--gty-text)':cfg.color,fontSize: 10,fontWeight:700 }}>{cfg.label}</span>
            <h3 style={{ fontFamily: 'var(--font-body)',fontSize:16,fontWeight:700,margin:'6px 0 2px' }}>{race.name}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{race.sport} · {new Date(race.date).toLocaleDateString(currentLocale(),{ weekday:'long',day:'numeric',month:'long',year:'numeric' })}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>{race.runDistance}</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'3px 0 0' }}>{race.triDistance}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 14px',borderRadius: 'var(--r-md)',background:days > 0 ? cfg.bg : 'var(--bg-card2)',border:`1px solid ${days > 0 ? cfg.border + '44' : 'var(--border)'}`,marginBottom:12 }}>
          <div style={{ textAlign:'center',minWidth:44 }}>
            <p style={{ fontFamily: 'var(--font-body)',fontSize:days > 0 ? 26 : 16,fontWeight:800,color:days > 0 ? race.level==='gty'?'var(--gty-text)':cfg.color : 'var(--text-dim)',margin:0,lineHeight:1 }}>{days > 0 ? days : '✓'}</p>
            <p style={{ fontSize: 10,color:'var(--text-dim)',margin:'2px 0 0' }}>{days > 0 ? t('calendar.days') : t('calendar.past')}</p>
          </div>
          {race.goal && (
            <div>
              <p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 2px' }}>{t('calendar.objective')}</p>
              <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{race.goal}</p>
            </div>
          )}
        </div>
        {race.strategy && (
          <div style={{ padding:'10px 12px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:12 }}>
            <p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 4px' }}>{t('calendar.strategy')}</p>
            <p style={{ fontSize:12,margin:0,color:'var(--text-mid)',lineHeight:1.5 }}>{race.strategy}</p>
          </div>
        )}
        <div style={{ display:'flex',gap:7 }}>
          <button onClick={() => { onDelete(race.id); onClose() }}
            style={{ padding:'8px 12px',borderRadius: 'var(--r-sm)',background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.3)',color:'var(--danger)',fontSize:11,cursor:'pointer' }}>
            {t('calendar.delete')}
          </button>
          <button onClick={onEdit}
            style={{ flex:1,padding:'8px 12px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>
            {t('calendar.edit')}
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
  const { t } = useI18n()
  const dd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`
  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState(dd)
  const [description, setDesc]  = useState('')
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius: 'var(--r-lg)',border:'1px solid var(--border-mid)',padding:22,maxWidth:420,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily: 'var(--font-body)',fontSize:15,fontWeight:700,margin:0 }}>{t('calendar.addEvent')}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.eventTitle')}</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('calendar.eventTitlePh')}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.date')}</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{t('calendar.description')}</p>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder={t('calendar.optionalPh')}
            style={{ width:'100%',padding:'7px 10px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' }}/>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{t('calendar.cancel')}</button>
          <button onClick={() => { if (title && date) { onSave({ category:'race',date,title,description:description||undefined,color:'#9ca3af' }); onClose() } }}
            style={{ flex:2,padding:10,borderRadius: 'var(--r-sm)',background:'linear-gradient(135deg,#6b7280,#9ca3af)',border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            {t('calendar.addPlus')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RACE TAB — new component-based implementation
// ════════════════════════════════════════════════
// Tests planifiés : stockés dans calendar_events (category='test'), sport et
// slug du test Performance lié encodés dans `ref` = "<sport>:<slug|custom>".
const TEST_SPORT_COLOR: Record<string, string> = { running: '#22c55e', cycling: '#3b82f6', natation: '#06b6d4', aviron: '#14b8a6', hyrox: '#ec4899', gym: '#f97316' }
function parseTestRef(ref?: string | null): { sport: PlannedTestInput['sport']; slug: string | null } {
  const [sport, slug] = (ref ?? 'running:custom').split(':')
  return { sport: (sport as PlannedTestInput['sport']) || 'running', slug: slug && slug !== 'custom' ? slug : null }
}
function eventToTestInput(ev: CalEvent): PlannedTestInput {
  const { sport, slug } = parseTestRef(ev.ref)
  return { sport, title: ev.title, protocol: ev.description ?? '', date: ev.date, ref: slug }
}

function RaceTab({ races, raceStages, tests, addEvent, updateEvent, deleteEvent, addRaceWithFiles, updateRaceWithFiles, updateRace, deleteRace, markCompleted, addRaceStage, updateRaceStage, deleteRaceStage, patchStageDayLocal, deleteStageDayLocal }: {
  races: Race[]; raceStages: RaceStage[]
  tests: CalEvent[]
  addEvent: (e: Omit<CalEvent, 'id'>) => void
  updateEvent: (e: CalEvent) => void
  deleteEvent: (id: string) => void
  addRaceWithFiles: (r: Omit<Race, 'id' | 'validated' | 'validationData'>, files: File[], fb?: File[], fr?: File[]) => Promise<void>
  updateRaceWithFiles: (r: Race, files: File[], fb?: File[], fr?: File[]) => Promise<void>
  updateRace: (r: Race) => void; deleteRace: (id: string) => void
  markCompleted: (id: string) => void
  addRaceStage: (s: Omit<RaceStage, 'id'>, dayFiles: { date: string; file: File }[]) => Promise<void>
  updateRaceStage: (s: RaceStage, dayFiles: { date: string; file: File }[]) => Promise<void>
  deleteRaceStage: (id: string) => void
  patchStageDayLocal: (stageId: string, date: string, content: string) => void
  deleteStageDayLocal: (stageId: string, date: string) => void
}) {
  const { t } = useI18n()
  const [calView,      setCalView]      = useState<CalView>('year')
  // Guide plumbing : le tour guidé peut basculer la vue via `cal:year` / `cal:month`.
  useGuideTabDemo('cal', (k) => setCalView(k as CalView))
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [showRaceModal,  setShowRaceModal]  = useState(false)
  const [editRace,    setEditRace]    = useState<Race | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined)
  const [prefillLevel, setPrefillLevel] = useState<RaceLevel | undefined>(undefined)
  // EventModal: null = closed, {mode,stage?} = open
  const [eventModal, setEventModal] = useState<{ mode: 'create' | 'edit'; stage?: RaceStage; initialDate?: string } | null>(null)
  // Chooser « ajouter un objectif » : date du jour cliqué (null = fermé)
  const [chooserDate, setChooserDate] = useState<string | null>(null)
  // DayModal
  const [dayModal,   setDayModal]   = useState<{ stage: RaceStage; date: string } | null>(null)
  // Year selector
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  const gty  = races.find(r => r.level === 'gty' && new Date(r.date).getFullYear() === selectedYear)
  const yearRaces = races.filter(r => new Date(r.date).getFullYear() === selectedYear)
  const yearStages = raceStages.filter(s => {
    const sy = new Date(s.startDate + 'T12:00:00').getFullYear()
    const ey = new Date(s.endDate + 'T12:00:00').getFullYear()
    return sy === selectedYear || ey === selectedYear
  })

  function openNewRace(date?: string, level?: RaceLevel) {
    setEditRace(null)
    setPrefillDate(date)
    setPrefillLevel(level)
    setShowRaceModal(true)
  }
  function closeRaceModal() {
    setShowRaceModal(false)
    setEditRace(null)
    setPrefillDate(undefined)
    setPrefillLevel(undefined)
  }

  // ── Tests planifiés (objectif « Test ») ────────────────────────────
  const [testSheet, setTestSheet] = useState<{ mode: 'create' | 'edit'; ev?: CalEvent; initialDate?: string } | null>(null)
  function saveTest(input: PlannedTestInput) {
    const payload = {
      category: 'test' as const, title: input.title, description: input.protocol || undefined,
      date: input.date, color: TEST_SPORT_COLOR[input.sport] ?? '#8b5cf6',
      ref: `${input.sport}:${input.ref ?? 'custom'}`,
    }
    if (testSheet?.mode === 'edit' && testSheet.ev) updateEvent({ ...testSheet.ev, ...payload })
    else addEvent(payload)
    setTestSheet(null)
  }
  const yearTests = tests.filter(e => new Date(e.date + 'T12:00:00').getFullYear() === selectedYear)
    .sort((a, b) => a.date.localeCompare(b.date))

  async function handleSaveRace(
    r: Omit<Race, 'id' | 'validated' | 'validationData'>,
    files: File[], filesBike?: File[], filesRun?: File[],
  ) {
    if (editRace) {
      await updateRaceWithFiles({ ...editRace, ...r }, files, filesBike, filesRun)
    } else {
      await addRaceWithFiles(r, files, filesBike, filesRun)
    }
    closeRaceModal()
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      <div data-guide="cal-goal"><GoalBanner gty={gty} races={races} year={selectedYear} /></div>

      {/* Année (tap → sur-page de sélection, bas → haut) — seulement en vue annuelle */}
      {calView === 'year' && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-start' }}>
          <button
            data-guide="cal-view"
            onClick={() => setYearPickerOpen(true)}
            style={{
              fontFamily: 'var(--font-display)',fontSize:30,fontWeight:800,
              background:'transparent',border:'none',cursor:'pointer',
              color:'var(--text)',padding:'0 2px',letterSpacing:'-0.02em',
              display:'flex',alignItems:'center',gap:6,
            }}
          >
            {selectedYear}
            <span style={{ fontSize:15,color:'var(--text-dim)',fontWeight:400 }}>▾</span>
          </button>
        </div>
      )}

      {/* Sur-page de sélection d'année (± 100 ans) */}
      {yearPickerOpen && (
        <YearPickerSheet
          selected={selectedYear}
          onSelect={y => setSelectedYear(y)}
          onClose={() => setYearPickerOpen(false)}
        />
      )}

      {/* Views — vue annuelle façon iOS (grille 12 mini-mois) / vue mensuelle */}
      <div data-guide="cal-day">
        {calView === 'year' ? (
          <YearGridView
            races={yearRaces} stages={yearStages} year={selectedYear}
            onMonthClick={m => { setCurrentMonth(m); setCalView('month') }}
          />
        ) : (
          <MonthPageView
            races={yearRaces} stages={yearStages} year={selectedYear} month={currentMonth}
            onBack={() => setCalView('year')}
            onRaceClick={r => { setEditRace(r); setPrefillDate(undefined); setShowRaceModal(true) }}
            onStageDayClick={(s, date) => setDayModal({ stage: s, date })}
            onDayClick={date => setChooserDate(date)}
          />
        )}
      </div>

      {/* Tests planifiés (objectif « Test ») */}
      {yearTests.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 10px' }}>Tests planifiés · {selectedYear}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {yearTests.map(ev => {
              const { sport, slug } = parseTestRef(ev.ref)
              const color = TEST_SPORT_COLOR[sport] ?? '#8b5cf6'
              const d = new Date(ev.date + 'T12:00:00')
              return (
                <div key={ev.id} onClick={() => setTestSheet({ mode: 'edit', ev })}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, background: 'var(--bg-card2)', cursor: 'pointer' }}>
                  <Target size={17} color={color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}{slug ? ' · lié à Performance' : ''}</div>
                  </div>
                  {slug && (
                    // Interconnexion : lien direct vers le test dans la page Performance.
                    <a href={`/performance?test=${encodeURIComponent(slug)}`} onClick={e => e.stopPropagation()}
                      style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color, textDecoration: 'none', border: `1px solid ${color}55`, borderRadius: 'var(--r-sm)', padding: '5px 9px' }}>
                      Voir le test →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next race bar */}
      <NextRaceBar races={races} onEdit={r => { setEditRace(r); setShowRaceModal(true) }} />

      {/* Empty state */}
      {yearRaces.length === 0 && yearStages.length === 0 && (
        <div style={{ padding:'32px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius: 'var(--r-md)' }}>
          <p style={{ fontFamily: 'var(--font-body)',fontSize:15,fontWeight:700,margin:'0 0 6px' }}>{t('calendar.noGoalPlanned', { year: selectedYear })}</p>
          <button onClick={() => setChooserDate(new Date().toISOString().split('T')[0])} style={{
            padding:'9px 20px',borderRadius: 'var(--r-sm)',background:'linear-gradient(135deg,#06B6D4,#5b6fff)',
            border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:700,fontSize:13,cursor:'pointer',
          }}>
            {t('calendar.addGoal')}
          </button>
        </div>
      )}

      {showRaceModal && (
        <RaceModal
          race={editRace ?? undefined}
          initialDate={prefillDate}
          initialLevel={prefillLevel}
          onClose={closeRaceModal}
          onSave={handleSaveRace}
          onDelete={editRace ? () => { deleteRace(editRace.id); closeRaceModal() } : undefined}
        />
      )}
      {eventModal && (
        <EventModal
          mode={eventModal.mode}
          initialData={eventModal.stage}
          initialDate={eventModal.initialDate}
          onClose={() => setEventModal(null)}
          onDelete={eventModal.mode === 'edit' && eventModal.stage
            ? () => { deleteRaceStage(eventModal.stage!.id); setEventModal(null) }
            : undefined}
          onSave={async (s, dayFiles) => {
            if (eventModal.mode === 'edit' && eventModal.stage) {
              await updateRaceStage({ ...eventModal.stage, ...s }, dayFiles)
            } else {
              await addRaceStage(s, dayFiles)
            }
            setEventModal(null)
          }}
        />
      )}
      {dayModal && (
        <DayModal
          stage={dayModal.stage}
          date={dayModal.date}
          onClose={() => setDayModal(null)}
          onSaved={(date, content) => patchStageDayLocal(dayModal.stage.id, date, content)}
          onDeleted={(date) => { deleteStageDayLocal(dayModal.stage.id, date); setDayModal(null) }}
        />
      )}

      {/* Chooser « Ajouter un objectif » — ouvert au clic sur un jour */}
      {chooserDate && (
        <ObjectiveChooser
          date={chooserDate}
          onClose={() => setChooserDate(null)}
          onCourse={() => { const d = chooserDate; setChooserDate(null); openNewRace(d) }}
          onStage={() => { const d = chooserDate; setChooserDate(null); setEventModal({ mode: 'create', initialDate: d }) }}
          onTest={() => { const d = chooserDate; setChooserDate(null); setTestSheet({ mode: 'create', initialDate: d }) }}
          onEvent={() => { const d = chooserDate; setChooserDate(null); openNewRace(d, 'event') }}
        />
      )}

      {/* Éditeur de test planifié */}
      {testSheet && (
        <TestEditorSheet
          mode={testSheet.mode}
          initial={testSheet.ev ? eventToTestInput(testSheet.ev) : undefined}
          initialDate={testSheet.initialDate}
          onClose={() => setTestSheet(null)}
          onDelete={testSheet.mode === 'edit' && testSheet.ev ? () => { deleteEvent(testSheet.ev!.id); setTestSheet(null) } : undefined}
          onSave={saveTest}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// OBJECTIVE CHOOSER — feuille basse : Course ou Stage
// ════════════════════════════════════════════════
const EVENT_PINK = '#ec4899' // design-allow-color — tuile « Événement / Défi » (même rose que le desktop)
function ObjectiveChooser({ date, onClose, onCourse, onStage, onTest, onEvent }: {
  date: string; onClose: () => void; onCourse: () => void; onStage: () => void; onTest: () => void; onEvent: () => void
}) {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const pretty = new Date(date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  // Animation réelle : entrée coulissante bas → haut + fondu, portal au-dessus
  // du shell (la barre de bulles du haut ne transparaît plus).
  const [shown, setShown] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setShown(false); setTimeout(onClose, 280) }

  // ── MOBILE (≤ 767 px) : feuille Annuler · titre, date en sous-titre,
  // liste groupée blanche (tuiles d'icône teintées + chevron).
  if (isMobile) return (
    <MSheet open={shown} onClose={close} full={false} label={t('calendar.addGoalTitle')} zIndex={5000}>
      <SheetHeader leftLabel={t('calendar.cancel')} onLeft={close} title={t('calendar.addGoalTitle')} />
      <div style={{ background: PAGE_BG, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <p style={{ margin: '0 4px 10px', fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'capitalize' }}>{pretty}</p>
        <Group>
          <GroupRow first onClick={onCourse} icon={<IconTile color={TILE.cyan}><Trophy size={20} /></IconTile>} label={t('calendar.race')} sub={t('calendar.raceChooserSub')} />
          <GroupRow onClick={onStage} icon={<IconTile color={TILE.indigo}><CalendarDays size={20} /></IconTile>} label={t('calendar.stage')} sub={t('calendar.stageChooserSub')} />
          <GroupRow onClick={onTest} icon={<IconTile color={TILE.violet}><Target size={20} /></IconTile>} label="Test" sub={t('calendar.testFormPerf')} />
          <GroupRow onClick={onEvent} icon={<IconTile color={EVENT_PINK}><PartyPopper size={20} /></IconTile>} label={t('calendar.eventGoal')} sub={t('calendar.eventGoalSub')} />
        </Group>
      </div>
    </MSheet>
  )
  const card: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '22px 16px',
    borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer',
    color: 'var(--text)', fontFamily: 'inherit',
  }
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', opacity: shown ? 1 : 0, transition: 'opacity 0.28s' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', padding: '20px 24px calc(24px + env(safe-area-inset-bottom))',
        boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '0 auto 14px' }} />
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0, textAlign: 'center' }}>{t('calendar.addGoalTitle')}</p>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '4px 0 18px', textAlign: 'center', textTransform: 'capitalize' }}>{pretty}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460, margin: '0 auto' }}>
          <button onClick={onCourse} style={card}>
            <Trophy size={26} color="#06B6D4" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('calendar.race')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center' }}>{t('calendar.raceChooserSub')}</span>
          </button>
          <button onClick={onStage} style={card}>
            <CalendarDays size={26} color="#5b6fff" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('calendar.stage')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center' }}>{t('calendar.stageChooserSub')}</span>
          </button>
          <button onClick={onTest} style={card}>
            <Target size={26} color="#8b5cf6" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Test</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center' }}>{t('calendar.testFormPerf')}</span>
          </button>
          <button onClick={onEvent} style={card}>
            <PartyPopper size={26} color="#ec4899" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('calendar.eventGoal')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center' }}>{t('calendar.eventGoalSub')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ════════════════════════════════════════════════
// CATEGORY EVENT MODAL (Pro / Perso)
// ════════════════════════════════════════════════
// Responsive : bureau = sur-page CENTRÉE (milieu de l'écran), mobile = sur-page
// basse. Types supprimés (comme les objectifs Course) : titre + date +
// description + importance ; la teinte d'importance donne la couleur (bleu Pro /
// violet Perso). Sert à la fois à créer et à modifier un objectif.
function CategoryEventModal({ category, initialDate, initial, onClose, onSave, onDelete }: {
  category: 'pro' | 'perso'
  initialDate: string
  initial?: CalEvent
  onClose: () => void
  onSave: (e: Omit<CalEvent, 'id'>) => void
  onDelete?: () => void
}) {
  const { t: tr } = useI18n()
  const narrow = useIsMobile()
  const [title, setTitle]     = useState(initial?.title ?? '')
  const [date, setDate]       = useState(initial?.date ?? initialDate)
  const [desc, setDesc]       = useState(initial?.description ?? '')
  const [importance, setImportance] = useState<Importance>(initial?.importance ?? 'normal')
  const shade = eventShade(category, importance)

  const [shown, setShown] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setShown(false); setTimeout(onClose, 280) }

  function save() {
    if (!title.trim() || !date) return
    onSave({ category, date, title: title.trim(), description: desc || undefined, color: shade, importance, done: initial?.done ?? false })
    close()
  }

  const body = (
    <>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
        <h3 style={{ fontFamily: 'var(--font-body)',fontSize:16,fontWeight:800,margin:0 }}>
          {initial ? tr('calendar.editBtn') : tr('calendar.addEventCategory', { category: tr(CATEGORY_LABEL_KEY[category]) })}
        </h3>
        <button onClick={close} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
      </div>

      <div style={{ marginBottom:10 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{tr('calendar.titleLabel')}</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={tr('calendar.eventTitlePlaceholder')} autoFocus
          style={{ width:'100%',padding:'9px 11px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none' }}/>
      </div>
      <div style={{ marginBottom:10 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{tr('calendar.date')}</p>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width:'100%',padding:'9px 11px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none' }}/>
      </div>
      <div style={{ marginBottom:12 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{tr('calendar.description')}</p>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder={tr('calendar.optional')}
          style={{ width:'100%',padding:'9px 11px',borderRadius: 'var(--r-sm)',border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',resize:'none' }}/>
      </div>

      {/* Importance : dégradé de teinte (bleu pour Pro, violet pour Perso). */}
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>{tr('calendar.importance')}</p>
        <div style={{ display:'flex',gap:6 }}>
          {(['normal','important','primordial'] as Importance[]).map(lvl => {
            const c = eventShade(category, lvl); const on = importance === lvl
            return (
              <button key={lvl} onClick={() => setImportance(lvl)}
                style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 6px',borderRadius: 'var(--r-sm)',border:`1.5px solid ${on?c:'var(--border)'}`,background:on?`${c}1f`:'var(--bg-card2)',color:on?c:'var(--text-mid)',fontSize:11,fontWeight:on?700:500,cursor:'pointer' }}>
                <span style={{ width:10,height:10,borderRadius:'50%',background:c,flexShrink:0 }} />
                {tr(IMPORTANCE_LABEL_KEY[lvl])}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex',gap:8 }}>
        {onDelete && (
          <button onClick={() => { onDelete(); close() }} aria-label={tr('calendar.delete')}
            style={{ padding:'11px 14px',borderRadius: 'var(--r-md)',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.24)',color:'var(--danger)',fontSize:13,fontWeight:700,cursor:'pointer' }}>✕</button>
        )}
        <button onClick={close} style={{ flex:1,padding:11,borderRadius: 'var(--r-md)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer' }}>{tr('calendar.cancel')}</button>
        <button onClick={save}
          style={{ flex:2,padding:11,borderRadius: 'var(--r-md)',background:shade,border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:700,fontSize:13,cursor:'pointer' }}>
          {initial ? tr('calendar.save') : tr('calendar.addBtn')}
        </button>
      </div>
    </>
  )

  // ── Mobile (≤ 767 px) : feuille Annuler · titre · Ajouter, corps gris,
  // champs pleins doux en carte blanche, importance en segmenté, suppression
  // en ligne rouge.
  if (narrow) {
    const sheetTitle = initial ? tr('calendar.editBtn') : tr('calendar.addEventCategory', { category: tr(CATEGORY_LABEL_KEY[category]) })
    return (
      <MSheet open={shown} onClose={close} full={false} label={sheetTitle} zIndex={5000}>
        <SheetHeader leftLabel={tr('calendar.cancel')} onLeft={close} title={sheetTitle}
          rightLabel={initial ? tr('calendar.save') : tr('calendar.addBtn')} onRight={save} rightDisabled={!title.trim() || !date} />
        <FormMProvider>
          <div style={{ ...M_SCROLL, flex: 'none', maxHeight: '78dvh' }}>
            <MSection>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <MField label={tr('calendar.titleLabel')}>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder={tr('calendar.eventTitlePlaceholder')} autoFocus style={{ ...M_INP, fontWeight: 700 }} />
                </MField>
                <MField label={tr('calendar.date')}>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={M_INP} />
                </MField>
              </div>
            </MSection>
            <MSection label={tr('calendar.description')}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder={tr('calendar.optional')} style={M_TEXTAREA} />
            </MSection>
            <MSection label={tr('calendar.importance')} bare>
              <MSeg<Importance> value={importance} onChange={setImportance}
                options={(['normal', 'important', 'primordial'] as Importance[]).map(lvl => ({ v: lvl, l: <><MDot color={eventShade(category, lvl)} />{tr(IMPORTANCE_LABEL_KEY[lvl])}</> }))} />
            </MSection>
            {onDelete && <MDangerRow label={tr('calendar.delete')} onClick={() => { onDelete(); close() }} />}
          </div>
        </FormMProvider>
      </MSheet>
    )
  }

  return createPortal(
    (
      // ── Bureau : sur-page CENTRÉE (milieu de l'écran) ───────────────
      <div onClick={close} style={{
        position:'fixed',inset:0,zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,
        background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',opacity:shown?1:0,transition:'opacity 0.28s',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width:'100%',maxWidth:440,maxHeight:'calc(100dvh - 40px)',overflowY:'auto',
          background:'var(--bg-card)',borderRadius: 'var(--r-lg)',border:'1px solid var(--border-mid)',
          padding:'22px 22px',boxShadow:'0 24px 80px rgba(0,0,0,0.35)',
          transform:shown?'scale(1)':'scale(0.94)',opacity:shown?1:0,
          transition:'transform 0.26s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease',
        }}>
          {body}
        </div>
      </div>
    ),
    document.body,
  )
}

// ════════════════════════════════════════════════
// CATEGORY TAB (Pro / Perso)
// ════════════════════════════════════════════════
// Objectifs Pro / Perso — MÊME présentation que les objectifs Course : vue
// annuelle iOS (grille 12 mini-mois) + vue mensuelle iOS, sélecteur d'année,
// ajout/édition via sur-page (centrée sur bureau, basse sur mobile). Système de
// « types » supprimé : couleur = teinte d'importance (bleu Pro / violet Perso).
function CategoryTab({ category, events, addEvent, updateEvent, deleteEvent }: {
  category: 'pro' | 'perso'
  events: CalEvent[]
  addEvent: (e: Omit<CalEvent, 'id'>) => void
  updateEvent: (e: CalEvent) => void
  deleteEvent: (id: string) => void
}) {
  const { t: tr } = useI18n()
  const [calView, setCalView]           = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  // Sur-page d'objectif : { date, ev? } (ev présent → édition, sinon création).
  const [eventModal, setEventModal] = useState<{ date: string; ev?: CalEvent } | null>(null)

  const myEvents = events.filter(e => e.category === category)
  const yearEvents = myEvents
    .filter(e => new Date(e.date + 'T12:00:00').getFullYear() === selectedYear)
    .sort((a, b) => a.date.localeCompare(b.date))

  const colorOf = (e: CalEvent) => e.color ?? eventShade(category, e.importance)

  // Couleur d'un jour dans la grille annuelle : teinte la plus forte du jour.
  function colorForDay(ds: string): string | null {
    const day = myEvents.filter(e => e.date === ds)
    if (day.length === 0) return null
    const order: Importance[] = ['primordial', 'important', 'normal']
    for (const imp of order) { const f = day.find(e => (e.importance ?? 'normal') === imp); if (f) return colorOf(f) }
    return colorOf(day[0])
  }
  // Pastilles d'un jour dans la vue mensuelle (tap → édition de l'objectif).
  function itemsForDay(ds: string) {
    return myEvents.filter(e => e.date === ds).map(e => ({
      key: e.id, label: e.title, color: colorOf(e),
      onClick: () => setEventModal({ date: ds, ev: e }),
    }))
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Année (tap → sur-page de sélection) — seulement en vue annuelle */}
      {calView === 'year' && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-start' }}>
          <button
            onClick={() => setYearPickerOpen(true)}
            style={{
              fontFamily: 'var(--font-display)',fontSize:30,fontWeight:800,
              background:'transparent',border:'none',cursor:'pointer',
              color:'var(--text)',padding:'0 2px',letterSpacing:'-0.02em',
              display:'flex',alignItems:'center',gap:6,
            }}
          >
            {selectedYear}
            <span style={{ fontSize:15,color:'var(--text-dim)',fontWeight:400 }}>▾</span>
          </button>
        </div>
      )}

      {yearPickerOpen && (
        <YearPickerSheet
          selected={selectedYear}
          onSelect={y => setSelectedYear(y)}
          onClose={() => setYearPickerOpen(false)}
        />
      )}

      {/* Vue annuelle façon iOS / vue mensuelle — identiques aux objectifs Course */}
      {calView === 'year' ? (
        <YearGridView
          year={selectedYear} colorForDay={colorForDay}
          onMonthClick={m => { setCurrentMonth(m); setCalView('month') }}
        />
      ) : (
        <MonthPageView
          year={selectedYear} month={currentMonth} itemsForDay={itemsForDay}
          onBack={() => setCalView('year')}
          onDayClick={date => setEventModal({ date })}
        />
      )}

      {/* Liste des objectifs {catégorie} : importance (teinte) + Fait / Pas fait. */}
      {yearEvents.length > 0 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius: 'var(--r-md)',padding:14 }}>
          <p style={{ fontFamily: 'var(--font-body)',fontSize:13,fontWeight:700,margin:'0 0 10px' }}>{tr('calendar.myObjectives', { category: tr(CATEGORY_LABEL_KEY[category]) })}</p>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {yearEvents.map(ev => {
              const col = colorOf(ev)
              return (
                <div key={ev.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:`1px solid ${col}33`,opacity:ev.done?0.62:1 }}>
                  <span style={{ width:9,height:9,borderRadius:'50%',background:col,flexShrink:0 }} />
                  <div onClick={() => setEventModal({ date: ev.date, ev })} style={{ flex:1,minWidth:0,cursor:'pointer' }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:0,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:ev.done?'line-through':'none' }}>{ev.title}</p>
                    <p style={{ fontSize:10.5,color:'var(--text-dim)',margin:'1px 0 0' }}>{new Date(ev.date+'T12:00:00').toLocaleDateString(currentLocale(),{ day:'numeric',month:'short',year:'numeric' })} · {tr(IMPORTANCE_LABEL_KEY[ev.importance ?? 'normal'])}</p>
                  </div>
                  <button onClick={() => updateEvent({ ...ev, done: !ev.done })}
                    style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 11px',borderRadius: 'var(--r-pill)',border:`1px solid ${ev.done?'#22c55e':'var(--border)'}`,background:ev.done?'rgba(34,197,94,0.14)':'var(--bg-card)',color:ev.done?'#22c55e':'var(--text-mid)',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0 }}>
                    {ev.done ? `✓ ${tr('calendar.statusDone')}` : tr('calendar.statusNotDone')}
                  </button>
                  <button onClick={() => deleteEvent(ev.id)} aria-label={tr('calendar.delete')}
                    style={{ width:28,height:28,borderRadius: 'var(--r-sm)',border:'none',background:'transparent',color:'var(--text-dim)',cursor:'pointer',flexShrink:0 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {yearEvents.length === 0 && (
        <div style={{ padding:'28px 20px',textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius: 'var(--r-md)' }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:`${CATEGORY_CONFIG[category].color}20`,border:`1px solid ${CATEGORY_CONFIG[category].color}40`,margin:'0 auto 10px' }}/>
          <p style={{ fontFamily: 'var(--font-body)',fontSize:14,fontWeight:700,margin:'0 0 12px' }}>{tr('calendar.noEventCategory', { category: tr(CATEGORY_LABEL_KEY[category]) })}</p>
          <button onClick={() => setEventModal({ date: new Date().toISOString().split('T')[0] })}
            style={{ padding:'8px 16px',borderRadius: 'var(--r-sm)',background:CATEGORY_CONFIG[category].color,border:'none',color:'#fff',fontFamily: 'var(--font-body)',fontWeight:600,fontSize:12,cursor:'pointer' }}>
            {tr('calendar.addBtn')}
          </button>
        </div>
      )}

      {eventModal && (
        <CategoryEventModal
          category={category}
          initialDate={eventModal.date}
          initial={eventModal.ev}
          onClose={() => setEventModal(null)}
          onDelete={eventModal.ev ? () => deleteEvent(eventModal.ev!.id) : undefined}
          onSave={e => {
            if (eventModal.ev) updateEvent({ ...eventModal.ev, ...e })
            else addEvent(e)
            setEventModal(null)
          }}
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
  run: 'RUN', trail: 'TRL', bike: 'BIK', swim: 'SWI',
  hyrox: 'HYR', triathlon: 'TRI', rowing: 'ROW',
}

function AllTab({ races, eventTypes, events }: { races: Race[]; eventTypes: CalEventType[]; events: CalEvent[] }) {
  // Build unified event list for current year
  interface UnifiedEvent {
    id: string; date: string; title: string
    category: 'race' | 'pro' | 'perso'
    color: string
    level?: RaceLevel
    sport?: RaceSport
  }

  const { t: tr } = useI18n()
  const monthShort = Array.from({ length: 12 }, (_, i) => tr(`lo.monthShort${i}`))
  const [view, setView] = useState<AllView>('vertical')
  // La vue circulaire (ClockView) est masquée sur mobile → on cache aussi son
  // bouton et on force la vue verticale sous 768 px.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const f = () => setIsMobile(window.innerWidth < 768)
    f(); window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  const effView: AllView = isMobile ? 'vertical' : view
  const [detail, setDetail] = useState<UnifiedEvent | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const year = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]

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
      {/* Toggle — la vue circulaire est cachée sur mobile */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {(isMobile
          ? [['vertical', tr('calendar.vertical')]]
          : [['vertical', tr('calendar.vertical')], ['circular', tr('calendar.circular')]]
        ).map(([v, l]) => (
          <button key={v} onClick={() => setView(v as AllView)} style={{
            padding: '6px 13px', borderRadius: 'var(--r-sm)', border: '1px solid', fontSize: 11, cursor: 'pointer',
            fontWeight: effView === v ? 600 : 400,
            borderColor: effView === v ? 'var(--primary)' : 'var(--border)',
            background: effView === v ? 'rgba(6,182,212,0.10)' : 'var(--bg-card)',
            color: effView === v ? '#06B6D4' : 'var(--text-mid)',
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* Circular view */}
      {effView === 'circular' && <ClockView events={clockEvents} year={year} />}

      {/* Vertical view */}
      {effView === 'vertical' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {unified.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic' }}>{tr('calendar.noEventForYear', { year })}</p>
            </div>
          )}
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([mi, monthEvents]) => (
              <div key={mi}>
                {/* Month header */}
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop: mi === Object.keys(byMonth).sort((a,b)=>Number(a)-Number(b))[0] ? 0 : 20, marginBottom: 8 }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase' as const, color:'var(--text-mid)' }}>
                    {monthShort[Number(mi)]}
                  </span>
                  <span style={{ fontSize:10, color:'var(--text-dim)' }}>
                    {monthEvents.length > 1 ? tr('calendar.eventsCountPlural', { n: monthEvents.length }) : tr('calendar.eventsCount', { n: monthEvents.length })}
                  </span>
                </div>

                {/* Event cards */}
                {monthEvents.map(ev => {
                  const isPast = ev.date < today
                  const days = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86_400_000)
                  const lvlCfg = ev.level ? RACE_CONFIG[ev.level] : null
                  const borderColor = ev.category === 'race' ? '#ef4444' : ev.category === 'pro' ? '#3b82f6' : '#a855f7'
                  const cdColor = isPast ? 'var(--text-dim)' : days < 7 ? '#ef4444' : days < 30 ? '#f97316' : 'var(--text-mid)'
                  const isHovered = hoveredId === ev.id
                  const dateLabel = new Date(ev.date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday:'long', day:'numeric', month:'long' })

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetail(ev)}
                      onMouseEnter={() => setHoveredId(ev.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--r-sm)',
                        borderLeft: `3px solid ${borderColor}`,
                        padding: '12px 16px',
                        marginBottom: 6,
                        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
                        transform: isHovered ? 'translateY(-1px)' : 'none',
                        transition: 'box-shadow 150ms, transform 150ms',
                        cursor: 'pointer',
                        opacity: isPast ? 0.55 : 1,
                      }}
                    >
                      {/* Main line */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                            {ev.title}
                          </span>
                          {ev.sport && (
                            <span style={{ fontSize:10, color:'var(--text-dim)', background:'var(--bg-card2)', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>
                              {SPORT_ABBR[ev.sport]}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize:15, fontWeight:700, color:cdColor, flexShrink:0, fontFamily: 'var(--font-body)' }}>
                          {isPast ? '✓' : days === 0 ? tr('calendar.todayAbbr') : tr('calendar.jMinus', { n: days })}
                        </span>
                      </div>
                      {/* Secondary line */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                        <span style={{ fontSize:12, color:'var(--text-dim)', textTransform:'capitalize' as const }}>
                          {dateLabel}
                        </span>
                        {lvlCfg && ev.level && (
                          <span style={{ fontSize:10, color:'var(--text-dim)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 6px', flexShrink:0 }}>
                            {tr(RACE_LEVEL_KEY[ev.level])}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}

      {detail && <EventDetail ev={detail} onClose={() => setDetail(null)} />}
    </div>
  )

  function EventDetail({ ev, onClose }: { ev: UnifiedEvent; onClose: () => void }) {
    const race = ev.category === 'race' ? races.find(r => r.id === ev.id) : undefined
    const calEv = ev.category !== 'race' ? events.find(e => e.id === ev.id) : undefined
    const borderColor = ev.category === 'race' ? '#ef4444' : ev.category === 'pro' ? '#3b82f6' : '#a855f7'
    const catLabel = tr(CATEGORY_LABEL_KEY[ev.category])
    const dateLabel = new Date(ev.date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const days = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86_400_000)
    const isPast = ev.date < today

    return (
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius: 'var(--r-lg)',borderLeft:`4px solid ${borderColor}`,border:`1px solid var(--border-mid)`,padding:24,maxWidth:480,width:'100%',maxHeight:'88vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:14 }}>
          {/* Header */}
          <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12 }}>
            <div>
              <span style={{ fontSize: 10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:borderColor }}>{catLabel}</span>
              <h3 style={{ fontFamily: 'var(--font-display)',fontSize:18,fontWeight:700,margin:'4px 0 0' }}>{ev.title}</h3>
            </div>
            <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius: 'var(--r-sm)',padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:14,flexShrink:0 }}>✕</button>
          </div>
          {/* Date + countdown */}
          <div style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 2px',textTransform:'capitalize' as const }}>{dateLabel}</p>
            </div>
            <span style={{ fontSize:20,fontWeight:800,color:isPast?'var(--text-dim)':days<7?'var(--danger)':days<30?'#f97316':'var(--text)',fontFamily: 'var(--font-body)' }}>
              {isPast ? tr('calendar.pastCheck') : days === 0 ? tr('calendar.todayFull') : tr('calendar.jMinus', { n: days })}
            </span>
          </div>
          {/* Race details */}
          {race && (
            <>
              {(race.sport || race.level) && (
                <div style={{ display:'flex',gap:8,flexWrap:'wrap' as const }}>
                  {race.sport && <span style={{ fontSize:11,padding:'3px 10px',borderRadius: 'var(--r-lg)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)' }}>{race.sport}</span>}
                  {race.level && <span style={{ fontSize:11,padding:'3px 10px',borderRadius: 'var(--r-lg)',background:`${RACE_CONFIG[race.level].color}18`,border:`1px solid ${RACE_CONFIG[race.level].color}44`,color:RACE_CONFIG[race.level].color }}>{tr(RACE_LEVEL_KEY[race.level])}</span>}
                  {race.runDistance && <span style={{ fontSize:11,padding:'3px 10px',borderRadius: 'var(--r-lg)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)' }}>{race.runDistance}</span>}
                  {race.triDistance && <span style={{ fontSize:11,padding:'3px 10px',borderRadius: 'var(--r-lg)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)' }}>{race.triDistance}</span>}
                </div>
              )}
              {(race.goalTime || race.goalSwimTime || race.goalBikeTime || race.goalRunTime) && (
                <div style={{ padding:'10px 14px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                  <p style={{ fontSize: 10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',margin:'0 0 6px' }}>{tr('calendar.goal')}</p>
                  <div style={{ display:'flex',gap:16,flexWrap:'wrap' as const }}>
                    {race.goalTime && <div><p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 1px' }}>{tr('calendar.time')}</p><p style={{ fontSize:14,fontWeight:700,margin:0,fontFamily: 'var(--font-body)' }}>{race.goalTime}</p></div>}
                    {race.goalSwimTime && <div><p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 1px' }}>{tr('calendar.swimming')}</p><p style={{ fontSize:14,fontWeight:700,margin:0,fontFamily: 'var(--font-body)' }}>{race.goalSwimTime}</p></div>}
                    {race.goalBikeTime && <div><p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 1px' }}>{tr('calendar.cycling')}</p><p style={{ fontSize:14,fontWeight:700,margin:0,fontFamily: 'var(--font-body)' }}>{race.goalBikeTime}</p></div>}
                    {race.goalRunTime && <div><p style={{ fontSize: 10,color:'var(--text-dim)',margin:'0 0 1px' }}>{tr('calendar.runLabel')}</p><p style={{ fontSize:14,fontWeight:700,margin:0,fontFamily: 'var(--font-body)' }}>{race.goalRunTime}</p></div>}
                  </div>
                </div>
              )}
              {race.strategy && (
                <div style={{ padding:'10px 14px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                  <p style={{ fontSize: 10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',margin:'0 0 6px' }}>{tr('calendar.strategy')}</p>
                  <p style={{ fontSize:12,color:'var(--text-mid)',margin:0,lineHeight:1.6 }}>{race.strategy}</p>
                </div>
              )}
              {race.notes && (
                <div style={{ padding:'10px 14px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                  <p style={{ fontSize: 10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',margin:'0 0 6px' }}>{tr('calendar.notes')}</p>
                  <p style={{ fontSize:12,color:'var(--text-mid)',margin:0,lineHeight:1.6 }}>{race.notes}</p>
                </div>
              )}
            </>
          )}
          {/* Pro/Perso event details */}
          {calEv?.description && (
            <div style={{ padding:'10px 14px',borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
              <p style={{ fontSize: 10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',margin:'0 0 6px' }}>{tr('calendar.description')}</p>
              <p style={{ fontSize:12,color:'var(--text-mid)',margin:0,lineHeight:1.6 }}>{calEv.description}</p>
            </div>
          )}
          {/* Close */}
          <button onClick={onClose} style={{ padding:10,borderRadius: 'var(--r-sm)',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer',marginTop:4 }}>
            {tr('calendar.close')}
          </button>
        </div>
      </div>
    )
  }
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// MOBILE — Objectifs façon Strava : objectif principal (J-x + anneau),
// filtre Tout / Course / Pro / Perso, liste « À venir », carte Année qui
// ouvre la vue 12 mois lisible. Les éditeurs existants sont réutilisés.
// ════════════════════════════════════════════════
type MFilter = 'all' | 'race' | 'pro' | 'perso'
interface MItem {
  key: string; date: string; endDate?: string; title: string
  group: 'race' | 'pro' | 'perso'; color: string; sub: string
  open: () => void
}

function MobileObjectifs({ cal }: { cal: ReturnType<typeof useCalendar> }) {
  const { t } = useI18n()
  const { races, raceStages, events, addEvent, updateEvent, deleteEvent, addRaceWithFiles, updateRaceWithFiles, deleteRace, addRaceStage, updateRaceStage, deleteRaceStage } = cal
  const [filter, setFilter] = useState<MFilter>('all')
  const [yearOpen, setYearOpen] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [raceSheet, setRaceSheet] = useState<{ race?: Race; date?: string; level?: RaceLevel } | null>(null)
  const [stageSheet, setStageSheet] = useState<{ stage?: RaceStage; date?: string } | null>(null)
  const [testSheet, setTestSheet] = useState<{ ev?: CalEvent; date?: string } | null>(null)
  const [catSheet, setCatSheet] = useState<{ category: 'pro' | 'perso'; date: string; ev?: CalEvent } | null>(null)
  const [chooserDate, setChooserDate] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const jx = (d: string) => { const n = daysUntil(d); return n === 0 ? t('calendar.mToday') : `J-${n}` }

  const items: MItem[] = [
    ...races.map((r): MItem => ({
      key: 'r' + r.id, date: r.date, endDate: r.endDate, title: r.name, group: 'race',
      color: r.level === 'gty' ? 'var(--text)' : RACE_CONFIG[r.level].color,
      sub: r.level === 'event' ? t('calendar.eventGoal') : `${t('calendar.race')} · ${t(RACE_LEVEL_KEY[r.level])}`,
      open: () => setRaceSheet({ race: r }),
    })),
    ...raceStages.map((s): MItem => ({
      key: 's' + s.id, date: s.startDate, endDate: s.endDate, title: s.name, group: 'race', color: '#5b6fff',
      sub: t('calendar.stage'), open: () => setStageSheet({ stage: s }),
    })),
    ...events.filter(e => e.category !== 'race').map((e): MItem => {
      if (e.category === 'test') {
        const c = TEST_SPORT_COLOR[parseTestRef(e.ref).sport] ?? '#8b5cf6'
        return { key: 'e' + e.id, date: e.date, title: e.title, group: 'race', color: c, sub: 'Test', open: () => setTestSheet({ ev: e }) }
      }
      const cat = e.category as 'pro' | 'perso'
      return {
        key: 'e' + e.id, date: e.date, title: e.title, group: cat, color: e.color ?? eventShade(cat, e.importance),
        sub: t(cat === 'pro' ? 'calendar.tabPro' : 'calendar.tabPerso') + (e.done ? ` · ${t('calendar.statusDone')}` : ''),
        open: () => setCatSheet({ category: cat, date: e.date, ev: e }),
      }
    }),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const shown = items.filter(i => filter === 'all' || i.group === filter)
  const upcoming = shown.filter(i => (i.endDate ?? i.date) >= today)

  // Objectif principal : GTY, sinon course principale, importante, puis la prochaine.
  const nextRaces = races.filter(r => r.date >= today && r.status !== 'completed' && r.level !== 'event').sort((a, b) => a.date.localeCompare(b.date))
  const main = (['gty', 'main', 'important'] as RaceLevel[]).map(l => nextRaces.find(r => r.level === l)).find(Boolean) ?? nextRaces[0]

  function add(date: string) {
    if (filter === 'pro' || filter === 'perso') setCatSheet({ category: filter, date })
    else setChooserDate(date)
  }

  const card = (children: React.ReactNode, pad = '18px 20px 20px') =>
    <div style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: pad, minWidth: 0 }}>{children}</div>
  const chevron = <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
  const head = (icon: React.ReactNode, title: string, meta?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <span aria-hidden style={{ display: 'flex', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>
      <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
      {meta}
    </div>
  )
  const filterBar = (
    <div role="tablist" style={{ display: 'flex', background: 'var(--dash-chip, var(--bg-card2))', borderRadius: 'var(--r-pill)', padding: 3 }}>
      {([['all', t('calendar.tabAll')], ['race', t('calendar.tabRace')], ['pro', t('calendar.tabPro')], ['perso', t('calendar.tabPerso')]] as [MFilter, string][]).map(([v, l]) => (
        <button key={v} role="tab" aria-selected={filter === v} type="button" onClick={() => setFilter(v)}
          style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '8px 0', fontSize: 14, fontWeight: filter === v ? 700 : 600, fontFamily: 'inherit',
            background: filter === v ? 'var(--dash-card, var(--bg-elev))' : 'transparent', color: filter === v ? 'var(--text)' : 'var(--text-mid)', boxShadow: filter === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>
          {l}
        </button>
      ))}
    </div>
  )
  const addBtn = (
    <button type="button" onClick={() => add(today)} className="thw-press"
      style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {t('calendar.addGoal')}
    </button>
  )
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
  // La vue Année (et le retour) repart toujours du haut de la page.
  const openYear = (open: boolean) => { setYearOpen(open); document.querySelector('main')?.scrollTo({ top: 0 }) }
  const fmtShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })

  let body: React.ReactNode
  if (!yearOpen) {
    const ring = main ? Math.max(0.04, Math.min(1, 1 - daysUntil(main.date) / 112)) : 0
    const r = 26, c = 2 * Math.PI * r
    body = <>
      {main && (
        <div role="button" tabIndex={0} className="dash-tap" onClick={() => setRaceSheet({ race: main })} onKeyDown={e => { if (e.key === 'Enter') setRaceSheet({ race: main }) }} style={{ cursor: 'pointer' }}>
          {card(<>
            {head(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1" /></svg>, t('calendar.mMain'), chevron)}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 15, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{main.name}</p>
                <span className="tnum" style={{ display: 'block', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)' }}>{jx(main.date)}</span>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>
                  {[cap(new Date(main.date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'long' })), main.distance || main.goal].filter(Boolean).join(' · ')}
                </p>
              </div>
              <svg aria-hidden width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
                <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="7" />
                <circle cx="32" cy="32" r={r} fill="none" stroke="var(--primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ring)} transform="rotate(-90 32 32)" />
              </svg>
            </div>
          </>)}
        </div>
      )}
      {filterBar}
      {card(<>
        {head(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>, t('calendar.mUpcoming'),
          <span className="tnum" style={{ fontSize: 14, color: 'var(--text-mid)' }}>{upcoming.length}</span>)}
        <div style={{ marginTop: 6 }}>
          {upcoming.length ? upcoming.map(i => (
            <button key={i.key} type="button" onClick={i.open}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: 'none', borderTop: '1px solid var(--dash-line, var(--border))', background: 'none', cursor: 'pointer', padding: '12px 0', fontFamily: 'inherit' }}>
              <span className="tnum" style={{ width: 58, flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{fmtShort(i.date)}</span>
              <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: i.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{i.title}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{i.sub} · {jx(i.date)}</span>
              </span>
            </button>
          )) : <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-dim)' }}>{t('calendar.mNoUpcoming')}</p>}
        </div>
      </>)}
      {addBtn}
      <div role="button" tabIndex={0} className="dash-tap" onClick={() => openYear(true)} onKeyDown={e => { if (e.key === 'Enter') openYear(true) }} style={{ cursor: 'pointer' }}>
        {card(<>
          {head(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18" /></svg>,
            t('calendar.mYear', { year }), <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 14, color: 'var(--text-mid)' }}>{t('calendar.mSee')}{chevron}</span>)}
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.4 }}>
            {t('calendar.mYearSub', { n: shown.filter(i => i.date.startsWith(String(year))).length })}
          </p>
        </>)}
      </div>
    </>
  } else {
    const yItems = shown.filter(i => i.date.startsWith(String(year)) || (i.endDate ?? '').startsWith(String(year)))
    const colorOn = (d: string) => yItems.find(i => d >= i.date && d <= (i.endDate ?? i.date))
    const navBtn = (dir: -1 | 1) => (
      <button type="button" aria-label={String(year + dir)} onClick={() => setYear(y => y + dir)} className="thw-press"
        style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--dash-card, var(--bg-card))', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
      </button>
    )
    const n = yItems.filter(i => (i.endDate ?? i.date) >= today).length
    body = <>
      <button type="button" onClick={() => openYear(false)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--primary)', fontFamily: 'inherit' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        {t('calendar.mUpcoming')}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {navBtn(-1)}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span className="tnum" style={{ display: 'block', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{year}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{t('calendar.mYearUpcoming', { n })}</span>
        </div>
        {navBtn(1)}
      </div>
      {filterBar}
      {card(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16, rowGap: 18 }}>
          {Array.from({ length: 12 }, (_, m) => {
            const first = getFirstDay(year, m)
            const nd = getDaysInMonth(year, m)
            return (
              <div key={m} style={{ minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t(`lo.month${m}`)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center', rowGap: 1 }}>
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)' }}>{d}</span>)}
                  {Array.from({ length: first - 1 }, (_, i) => <span key={'b' + i} />)}
                  {Array.from({ length: nd }, (_, i) => {
                    const ds = `${year}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                    const it = colorOn(ds)
                    const isToday = ds === today
                    return (
                      <button key={ds} type="button" onClick={() => it ? it.open() : add(ds)}
                        className="tnum"
                        style={{ border: 'none', padding: 0, height: 18, borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: it || isToday ? 800 : 500,
                          background: it ? it.color : isToday ? 'var(--text)' : 'transparent',
                          color: it ? (it.color === 'var(--text)' ? 'var(--bg)' : '#fff') : isToday ? 'var(--bg)' : 'var(--text-mid)' }}>
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>, '16px 14px 18px')}
    </>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
      {body}

      {raceSheet && (
        <RaceModal
          race={raceSheet.race}
          initialDate={raceSheet.date}
          initialLevel={raceSheet.level}
          onClose={() => setRaceSheet(null)}
          onSave={async (r, files, fb, fr) => {
            if (raceSheet.race) await updateRaceWithFiles({ ...raceSheet.race, ...r }, files, fb, fr)
            else await addRaceWithFiles(r, files, fb, fr)
            setRaceSheet(null)
          }}
          onDelete={raceSheet.race ? () => { deleteRace(raceSheet.race!.id); setRaceSheet(null) } : undefined}
        />
      )}
      {stageSheet && (
        <EventModal
          mode={stageSheet.stage ? 'edit' : 'create'}
          initialData={stageSheet.stage}
          initialDate={stageSheet.date}
          onClose={() => setStageSheet(null)}
          onDelete={stageSheet.stage ? () => { deleteRaceStage(stageSheet.stage!.id); setStageSheet(null) } : undefined}
          onSave={async (s, dayFiles) => {
            if (stageSheet.stage) await updateRaceStage({ ...stageSheet.stage, ...s }, dayFiles)
            else await addRaceStage(s, dayFiles)
            setStageSheet(null)
          }}
        />
      )}
      {testSheet && (
        <TestEditorSheet
          mode={testSheet.ev ? 'edit' : 'create'}
          initial={testSheet.ev ? eventToTestInput(testSheet.ev) : undefined}
          initialDate={testSheet.date}
          onClose={() => setTestSheet(null)}
          onDelete={testSheet.ev ? () => { deleteEvent(testSheet.ev!.id); setTestSheet(null) } : undefined}
          onSave={input => {
            const payload = {
              category: 'test' as const, title: input.title, description: input.protocol || undefined,
              date: input.date, color: TEST_SPORT_COLOR[input.sport] ?? '#8b5cf6',
              ref: `${input.sport}:${input.ref ?? 'custom'}`,
            }
            if (testSheet.ev) updateEvent({ ...testSheet.ev, ...payload })
            else addEvent(payload)
            setTestSheet(null)
          }}
        />
      )}
      {catSheet && (
        <CategoryEventModal
          category={catSheet.category}
          initialDate={catSheet.date}
          initial={catSheet.ev}
          onClose={() => setCatSheet(null)}
          onDelete={catSheet.ev ? () => { deleteEvent(catSheet.ev!.id); setCatSheet(null) } : undefined}
          onSave={e => {
            if (catSheet.ev) updateEvent({ ...catSheet.ev, ...e })
            else addEvent(e)
            setCatSheet(null)
          }}
        />
      )}
      {chooserDate && (
        <ObjectiveChooser
          date={chooserDate}
          onClose={() => setChooserDate(null)}
          onCourse={() => { const d = chooserDate; setChooserDate(null); setRaceSheet({ date: d }) }}
          onStage={() => { const d = chooserDate; setChooserDate(null); setStageSheet({ date: d }) }}
          onTest={() => { const d = chooserDate; setChooserDate(null); setTestSheet({ date: d }) }}
          onEvent={() => { const d = chooserDate; setChooserDate(null); setRaceSheet({ date: d, level: 'event' }) }}
        />
      )}
    </div>
  )
}

export default function CalendarPage() {
  const { t } = useI18n()
  const cal = useCalendar()
  const { races, raceStages, eventTypes, events, loading, addRaceWithFiles, updateRaceWithFiles, updateRace, deleteRace, markCompleted, addRaceStage, updateRaceStage, deleteRaceStage, patchStageDayLocal, deleteStageDayLocal, addEvent, updateEvent, deleteEvent } = cal
  const isMobile = useNarrow(767)
  const { show, dismiss } = usePageOnboarding(CALENDAR_ONBOARDING.pageId, CALENDAR_ONBOARDING.version)

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

  const header = (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:24,fontWeight:600,margin:0 }}>{t('calendar.pageTitle')}</h1>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>{t('calendar.pageSubtitle')}</p>
      </div>
    </div>
  )

  const loader = (
    <div style={{ padding:'40px',textAlign:'center',color:'var(--text-dim)',fontSize:13 }}>{t('calendar.loading')}</div>
  )

  if (isMobile) {
    return (
      <>
        <PageHelp config={CALENDAR_ONBOARDING} show={show} onDismiss={dismiss} />
        {loading ? loader : <MobileObjectifs cal={cal} />}
      </>
    )
  }

  return (
    <>
      <PageHelp config={CALENDAR_ONBOARDING} show={show} onDismiss={dismiss} />
      <SectionLayout
        header={header}
        sections={[
          { id:'race',  label:t('calendar.tabRace'), subtitle:t('calendar.tabRaceSub'),  icon:Trophy,     content: loading ? loader : <RaceTab races={races} raceStages={raceStages} tests={events.filter(e => e.category === 'test')} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} addRaceWithFiles={addRaceWithFiles} updateRaceWithFiles={updateRaceWithFiles} updateRace={updateRace} deleteRace={deleteRace} markCompleted={markCompleted} addRaceStage={addRaceStage} updateRaceStage={updateRaceStage} deleteRaceStage={deleteRaceStage} patchStageDayLocal={patchStageDayLocal} deleteStageDayLocal={deleteStageDayLocal}/> },
          { id:'pro',   label:t('calendar.tabPro'),    subtitle:t('calendar.tabProSub'),  icon:Briefcase,  content: loading ? loader : <CategoryTab category="pro"   events={events} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}/> },
          { id:'perso', label:t('calendar.tabPerso'),  subtitle:t('calendar.tabPersoSub'),      icon:Heart,      content: loading ? loader : <CategoryTab category="perso" events={events} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}/> },
          { id:'all',   label:t('calendar.tabAll'),   subtitle:t('calendar.tabAllSub'),    icon:LayoutGrid, content: loading ? loader : <AllTab races={races} eventTypes={eventTypes} events={events}/> },
        ]}
      />
    </>
  )
}
