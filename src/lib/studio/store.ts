// ══════════════════════════════════════════════════════════════
// Studio — persistance SERVEUR des systèmes (table studio_systems).
// Remplace le localStorage : plusieurs systèmes par utilisateur,
// synchronisés entre appareils. RLS = owner only.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { loadGraph, type StudioGraph } from './graph'

export type StudioScope = 'perso' | 'coach'
export interface StudioSystemRow {
  id: string
  name: string
  graph: StudioGraph
  folder: string | null
  scope: StudioScope
  athlete_id: string | null   // système coach lié à un athlète précis (nullable)
  updated_at: string
}

const SELECT_COLS = 'id, name, graph, folder, scope, athlete_id, updated_at'

function normalizeRow(r: unknown): StudioSystemRow {
  const row = r as StudioSystemRow & { scope?: string }
  return { ...row, scope: row.scope === 'coach' ? 'coach' : 'perso', athlete_id: row.athlete_id ?? null }
}

export async function listSystems(): Promise<StudioSystemRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('studio_systems')
    .select(SELECT_COLS)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizeRow)
}

export async function createSystem(name: string, graph: StudioGraph, scope: StudioScope = 'perso', athleteId: string | null = null): Promise<StudioSystemRow> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('studio_systems')
    // athlete_id ne vaut que pour un système coach.
    .insert({ user_id: user.id, name, graph, scope, athlete_id: scope === 'coach' ? athleteId : null })
    .select(SELECT_COLS)
    .single()
  if (error) throw new Error(error.message)
  return normalizeRow(data)
}

export async function updateSystem(id: string, patch: { name?: string; graph?: StudioGraph; folder?: string | null; scope?: StudioScope; athlete_id?: string | null }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('studio_systems')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSystem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('studio_systems').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function duplicateSystem(row: StudioSystemRow): Promise<StudioSystemRow> {
  return createSystem(`${row.name} (copie)`, row.graph, row.scope, row.athlete_id)
}

// ── Migration douce depuis le localStorage ─────────────────────
// Si l'utilisateur n'a AUCUN système serveur mais un graphe local
// (ancienne version), on l'importe une fois puis on nettoie.
export async function migrateLocalGraphIfAny(existing: StudioSystemRow[]): Promise<StudioSystemRow | null> {
  if (existing.length > 0) return null
  try {
    const local = loadGraph()
    if (!local.nodes.length) return null
    const row = await createSystem(local.name || 'Importé de cet appareil', local)
    try { localStorage.removeItem('thw_studio_graph_v1') } catch { /* ignore */ }
    return row
  } catch {
    return null
  }
}
