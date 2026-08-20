'use client'
// ══════════════════════════════════════════════════════════════
// Fiches personnalisées — le coach crée des champs sur-mesure, l'athlète les
// remplit, et les réponses reviennent côté coach. RLS : coach ↔ son athlète.
// ══════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { createNotification } from '@/lib/notifications/create'

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'scale' | 'bool'
export interface FormField {
  id: string
  label: string
  type: FieldType
  options?: string[]      // pour 'select'
  placeholder?: string
  required?: boolean
}
export interface CustomForm {
  id: string
  coachId: string
  athleteId: string
  title: string
  fields: FormField[]
  responses: Record<string, string | number | boolean> | null
  status: 'sent' | 'filled'
  createdAt: string
  filledAt: string | null
}

function mapRow(r: Record<string, unknown>): CustomForm {
  return {
    id: String(r.id), coachId: String(r.coach_id), athleteId: String(r.athlete_id),
    title: String(r.title), fields: (r.fields as FormField[]) ?? [],
    responses: (r.responses as CustomForm['responses']) ?? null,
    status: r.status === 'filled' ? 'filled' : 'sent',
    createdAt: String(r.created_at), filledAt: (r.filled_at as string | null) ?? null,
  }
}

// ── Coach ─────────────────────────────────────────────────────
export async function createCustomForm(athleteId: string, title: string, fields: FormField[], athleteName?: string): Promise<CustomForm | null> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) return null
  const { data, error } = await sb.from('coach_custom_forms')
    .insert({ coach_id: user.id, athlete_id: athleteId, title: title.trim() || 'Fiche', fields })
    .select('*').single()
  if (error || !data) return null
  // Notifie l'athlète qu'une fiche l'attend.
  try {
    await createNotification(sb, athleteId, {
      type: 'coach.form_sent', title: 'Ton coach t’a envoyé une fiche à remplir',
      body: title.trim() || 'Une fiche personnalisée t’attend.', link: '/',
      dedupKey: `coach-form-${(data as { id: string }).id}`,
    })
  } catch { /* best-effort */ }
  return mapRow(data as Record<string, unknown>)
}

export async function listFormsForAthlete(athleteId: string): Promise<CustomForm[]> {
  const sb = createClient()
  const { data } = await sb.from('coach_custom_forms').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false })
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow)
}

export async function deleteCustomForm(id: string): Promise<void> {
  await createClient().from('coach_custom_forms').delete().eq('id', id)
}

// ── Athlète ───────────────────────────────────────────────────
export async function listMyForms(): Promise<CustomForm[]> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) return []
  const { data } = await sb.from('coach_custom_forms').select('*').eq('athlete_id', user.id).order('created_at', { ascending: false })
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow)
}

export async function submitFormResponses(id: string, responses: Record<string, string | number | boolean>): Promise<boolean> {
  const sb = createClient()
  const { data, error } = await sb.from('coach_custom_forms')
    .update({ responses, status: 'filled', filled_at: new Date().toISOString() })
    .eq('id', id).select('coach_id, title').single()
  if (error || !data) return false
  // Notifie le coach que la fiche est remplie.
  try {
    const row = data as { coach_id: string; title: string }
    await createNotification(sb, row.coach_id, {
      type: 'coach.form_filled', title: 'Une fiche a été remplie',
      body: `${row.title} — réponses disponibles.`, link: '/coach/athletes',
      dedupKey: `coach-form-filled-${id}`,
    })
  } catch { /* best-effort */ }
  return true
}
