'use client'
// Données + utilitaires partagés pour Records/Hyrox. Aucune donnée inventée :
// la table `hyrox_races` n'a PAS de colonne roxzone → le temps de roxzone saisi est
// replié dans le total (temps_final), non persisté séparément.
import { createClient } from '@/lib/supabase/client'

export const HYROX_STATIONS = ['SkiErg', 'Sled Push', 'Sled Pull', 'Burpee Broad Jump', 'Rowing', 'Farmers Carry', 'Sandbag Lunges', 'Wall Balls']

export type HyroxFormat = 'solo_open' | 'solo_pro' | 'duo_open' | 'duo_pro'
export const HYROX_FORMAT_LABELS: Record<HyroxFormat, string> = {
  solo_open: 'Solo Open', solo_pro: 'Solo Pro', duo_open: 'Duo Open', duo_pro: 'Duo Pro',
}

export interface HyroxRace {
  id: string
  user_id: string
  date: string
  format: HyroxFormat
  partenaire: string | null
  temps_final: string
  temps_run_total: string | null
  stations: Record<string, string>
  runs: string[]
  created_at: string
}

export function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  if (p.some(n => isNaN(n))) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}
export function mmss(sec: number): string {
  if (sec <= 0) return ''
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}
export function hmsTotal(sec: number): string {
  if (sec <= 0) return ''
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export async function fetchRaces(): Promise<HyroxRace[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('hyrox_races').select('*').eq('user_id', user.id).order('date', { ascending: false })
  return (data ?? []) as HyroxRace[]
}

export interface NewRace {
  date: string; format: HyroxFormat; partenaire: string | null
  temps_final: string; temps_run_total: string | null
  stations: Record<string, string>; runs: string[]
}
export async function insertRace(n: NewRace): Promise<HyroxRace | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('hyrox_races').insert({ user_id: user.id, ...n }).select().single()
  return (data as HyroxRace) ?? null
}
