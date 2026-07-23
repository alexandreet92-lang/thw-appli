// ══════════════════════════════════════════════════════════════
// Studio — persistance SERVEUR des systèmes (table studio_systems).
// Remplace le localStorage : plusieurs systèmes par utilisateur,
// synchronisés entre appareils. RLS = owner only.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { loadGraph, type StudioGraph } from './graph'

export interface StudioSystemRow {
  id: string
  name: string
  graph: StudioGraph
  updated_at: string
}

export async function listSystems(): Promise<StudioSystemRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('studio_systems')
    .select('id, name, graph, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as StudioSystemRow[]
}

export async function createSystem(name: string, graph: StudioGraph): Promise<StudioSystemRow> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('studio_systems')
    .insert({ user_id: user.id, name, graph })
    .select('id, name, graph, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data as StudioSystemRow
}

export async function updateSystem(id: string, patch: { name?: string; graph?: StudioGraph }): Promise<void> {
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
  return createSystem(`${row.name} (copie)`, row.graph)
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
