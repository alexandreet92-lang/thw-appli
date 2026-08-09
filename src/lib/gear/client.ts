'use client'
// ══════════════════════════════════════════════════════════════════════════
// Matériel côté client : liste (avec stats), ajout direct, rattachement à une
// activité, matériel par défaut (le seul, sinon le dernier utilisé).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export type GearKind = 'bike' | 'shoes'

export interface GearStats { total_sessions: number; total_km: number; total_hours: number; total_elev_m: number }
export interface GearItem {
  id: string
  name: string
  brand: string | null
  model?: string | null
  is_default?: boolean | null
  stats: GearStats
}

interface GearResponse { bikes?: GearItem[]; shoes?: GearItem[] }

/** Liste du matériel de l'utilisateur (vélos + chaussures) avec stats calculées. */
export async function listGear(): Promise<{ bikes: GearItem[]; shoes: GearItem[] }> {
  const res = await fetch('/api/gear', { cache: 'no-store' })
  if (!res.ok) return { bikes: [], shoes: [] }
  const j = (await res.json()) as GearResponse
  return { bikes: j.bikes ?? [], shoes: j.shoes ?? [] }
}

/** Ajout direct d'un matériel. Renvoie l'item créé (sans stats) ou null. */
export async function addGear(kind: GearKind, data: { name: string; brand?: string; model?: string }): Promise<GearItem | null> {
  const res = await fetch('/api/gear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: kind, data }),
  })
  if (!res.ok) return null
  const j = (await res.json()) as { bike?: GearItem; shoes?: GearItem }
  const item = kind === 'bike' ? j.bike : j.shoes
  return item ? { ...item, stats: { total_sessions: 0, total_km: 0, total_hours: 0, total_elev_m: 0 } } : null
}

/** Rattache (ou détache avec null) un matériel à une activité. RLS : propriétaire. */
export async function setActivityGear(activityId: string, kind: GearKind, gearId: string | null): Promise<boolean> {
  const sb = createClient()
  const patch = kind === 'bike' ? { bike_id: gearId } : { shoes_id: gearId }
  const { error } = await sb.from('activities').update(patch).eq('id', activityId)
  return !error
}

/** Matériel actuellement rattaché à une activité (bike_id / shoes_id). */
export async function getActivityGear(activityId: string): Promise<{ bike_id: string | null; shoes_id: string | null }> {
  const sb = createClient()
  const { data } = await sb.from('activities').select('bike_id, shoes_id').eq('id', activityId).maybeSingle()
  const d = data as { bike_id: string | null; shoes_id: string | null } | null
  return { bike_id: d?.bike_id ?? null, shoes_id: d?.shoes_id ?? null }
}

/** Dernier matériel utilisé pour ce type (activité la plus récente qui en a un). */
export async function getLastUsedGear(kind: GearKind, exceptActivityId?: string): Promise<string | null> {
  const sb = createClient()
  const col = kind === 'bike' ? 'bike_id' : 'shoes_id'
  let q = sb.from('activities').select(`${col}, started_at`).not(col, 'is', null).order('started_at', { ascending: false }).limit(1)
  if (exceptActivityId) q = q.neq('id', exceptActivityId)
  const { data } = await q
  const row = (data as Record<string, string | null>[] | null)?.[0]
  return (row?.[col] as string | null) ?? null
}
