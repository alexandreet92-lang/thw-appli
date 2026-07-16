// ══════════════════════════════════════════════════════════════
// Projets IA (table ai_projects) : CRUD synchronisé multi-appareils.
// Un projet regroupe des conversations et porte des instructions
// partagées appliquées par le coach dans toutes ses conversations.
// ══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

export interface AIProject {
  id: string
  name: string
  instructions: string
  color: string
  createdAt: number
  updatedAt: number
}

type Row = { id: string; name: string; instructions: string | null; color: string | null; created_at: string; updated_at: string }

function toProject(r: Row): AIProject {
  return {
    id: r.id,
    name: r.name,
    instructions: r.instructions ?? '',
    color: r.color ?? '#5b6fff',
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  }
}

export async function fetchProjects(sb: Sb, userId: string): Promise<AIProject[]> {
  try {
    const { data, error } = await sb
      .from('ai_projects')
      .select('id,name,instructions,color,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error || !data) return []
    return (data as Row[]).map(toProject)
  } catch {
    return []
  }
}

export async function createProject(
  sb: Sb, userId: string, input: { name: string; instructions?: string; color?: string },
): Promise<AIProject | null> {
  try {
    const { data, error } = await sb
      .from('ai_projects')
      .insert({ user_id: userId, name: input.name, instructions: input.instructions ?? '', color: input.color ?? '#5b6fff' })
      .select('id,name,instructions,color,created_at,updated_at')
      .single()
    if (error || !data) return null
    return toProject(data as Row)
  } catch {
    return null
  }
}

export async function updateProject(
  sb: Sb, userId: string, id: string, patch: { name?: string; instructions?: string; color?: string },
): Promise<void> {
  try {
    await sb.from('ai_projects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId).eq('id', id)
  } catch { /* non-bloquant */ }
}

export async function deleteProject(sb: Sb, userId: string, id: string): Promise<void> {
  try {
    await sb.from('ai_projects').delete().eq('user_id', userId).eq('id', id)
  } catch { /* non-bloquant */ }
}
