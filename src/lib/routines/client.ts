// ══════════════════════════════════════════════════════════════
// Client des routines : appels à /api/routines depuis l'interface.
// ══════════════════════════════════════════════════════════════

export interface Routine {
  id: string
  name: string
  prompt: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly'
  hour: number
  weekday: number | null
  timezone: string
  model: 'hermes' | 'athena' | 'zeus'
  allow_write: boolean
  enabled: boolean
  last_run_at: string | null
  created_at: string
}

export interface RoutineRun {
  id: string
  status: 'running' | 'done' | 'error'
  output: string | null
  error: string | null
  created_at: string
}

export type RoutineInput = {
  name: string
  prompt: string
  frequency: Routine['frequency']
  hour: number
  weekday?: number | null
  model: Routine['model']
  allow_write: boolean
  timezone?: string
}

async function j<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

export async function listRoutines(): Promise<Routine[]> {
  return (await j<{ routines: Routine[] }>(await fetch('/api/routines'))).routines
}

export async function createRoutine(body: RoutineInput): Promise<Routine> {
  return (await j<{ routine: Routine }>(await fetch('/api/routines', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))).routine
}

export async function updateRoutine(id: string, patch: Partial<RoutineInput> & { enabled?: boolean }): Promise<Routine> {
  return (await j<{ routine: Routine }>(await fetch(`/api/routines/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  }))).routine
}

export async function deleteRoutine(id: string): Promise<void> {
  await j(await fetch(`/api/routines/${id}`, { method: 'DELETE' }))
}

export async function runRoutine(id: string): Promise<{ ok: boolean; runId?: string; error?: string }> {
  return j(await fetch(`/api/routines/${id}/run`, { method: 'POST' }))
}

export async function listRuns(id: string): Promise<RoutineRun[]> {
  return (await j<{ runs: RoutineRun[] }>(await fetch(`/api/routines/${id}/runs`))).runs
}

// Résumé lisible du planning d'une routine.
export function scheduleLabel(r: Pick<Routine, 'frequency' | 'hour' | 'weekday'>): string {
  const h = `${String(r.hour).padStart(2, '0')}h00`
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  switch (r.frequency) {
    case 'daily': return `Chaque jour à ${h}`
    case 'weekdays': return `En semaine à ${h}`
    case 'weekends': return `Le week-end à ${h}`
    case 'weekly': return `Chaque ${days[r.weekday ?? 0]} à ${h}`
    default: return h
  }
}
