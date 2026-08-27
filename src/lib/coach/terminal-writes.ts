// ══════════════════════════════════════════════════════════════════
// TERMINAL WRITES côté SERVEUR — versions serveur des outils de planning
// qui, en chat interactif, s'appliquent côté NAVIGATEUR après validation.
// Ici on les rend exécutables SANS écran, pour les ROUTINES / le STUDIO
// autonomes (construire/ajuster un plan tout seul).
//
// ⚠️ Utilisés avec le client SERVICE (bypass RLS) → on IMPOSE le garde-fou
// user_id sur CHAQUE opération (l'IA ne peut toucher QUE l'athlète ciblé).
// Le parcours interactif (/api/coach-stream → carte de validation) reste
// INCHANGÉ : ce module n'est branché que dans run-headless.
// ══════════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { coachTools } from './tools-definition'

const NAMES = ['add_session', 'update_session', 'delete_session', 'move_session', 'add_week', 'update_plan_periodisation'] as const
export const terminalWriteTools: Anthropic.Tool[] = coachTools.filter(t => (NAMES as readonly string[]).includes(t.name))
export const TERMINAL_WRITE_NAMES: ReadonlySet<string> = new Set(NAMES)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>
const okJ = (o: Record<string, unknown>) => JSON.stringify({ ok: true, ...o })
const errJ = (m: string) => JSON.stringify({ ok: false, error: m })
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

async function planBelongs(sb: SB, planId: string | null, userId: string): Promise<boolean> {
  if (!planId) return true                       // séance sans plan rattaché = OK
  const { data } = await sb.from('training_plans').select('id').eq('id', planId).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function resolveTerminalWrite(name: string, input: Record<string, unknown>, sb: SB, userId: string): Promise<string> {
  try {
    const inp = input
    switch (name) {
      case 'add_session': {
        const planId = str(inp.training_plan_id) || null
        if (planId && !(await planBelongs(sb, planId, userId))) return errJ('Plan introuvable pour cet athlète.')
        const { error } = await sb.from('planned_sessions').insert({
          user_id: userId, plan_id: planId,
          week_start: inp.week_start, day_index: inp.day_index, sport: inp.sport, title: inp.title,
          time: inp.time ?? null, duration_min: inp.duration_min, blocks: inp.blocks ?? null,
          tss: inp.tss ?? null, intensity: inp.intensity ?? null, notes: inp.notes ?? null, rpe: inp.rpe ?? null,
          status: 'planned', source: 'ai_routine',
        })
        if (error) return errJ(error.message)
        return okJ({ page: 'Planning', added: 1 })
      }

      case 'update_session': {
        const sid = str(inp.session_id)
        if (!sid) return errJ('session_id requis.')
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        for (const k of ['sport', 'title', 'time', 'duration_min', 'tss', 'intensity', 'notes', 'rpe', 'blocks', 'status']) {
          if (inp[k] !== undefined) patch[k] = inp[k]
        }
        const { data, error } = await sb.from('planned_sessions').update(patch).eq('id', sid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Séance introuvable.')
        return okJ({ page: 'Planning', updated: sid })
      }

      case 'delete_session': {
        const sid = str(inp.session_id)
        if (!sid) return errJ('session_id requis.')
        const { data, error } = await sb.from('planned_sessions').delete().eq('id', sid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        return okJ({ page: 'Planning', deleted: (data ?? []).length })
      }

      case 'move_session': {
        const sid = str(inp.session_id)
        if (!sid) return errJ('session_id requis.')
        const { data, error } = await sb.from('planned_sessions')
          .update({ week_start: inp.new_week_start, day_index: inp.new_day_index })
          .eq('id', sid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Séance introuvable.')
        return okJ({ page: 'Planning', moved: sid })
      }

      case 'add_week': {
        const planId = str(inp.training_plan_id) || null
        if (planId && !(await planBelongs(sb, planId, userId))) return errJ('Plan introuvable pour cet athlète.')
        const arr = Array.isArray(inp.sessions) ? inp.sessions as Record<string, unknown>[] : []
        if (!arr.length) return errJ('Aucune séance fournie pour la semaine.')
        const rows = arr.slice(0, 14).map(s => ({
          user_id: userId, plan_id: planId,
          week_start: inp.week_start, day_index: s.day_index, sport: s.sport, title: s.title,
          time: s.time ?? null, duration_min: s.duration_min, blocks: s.blocks ?? null,
          tss: s.tss ?? null, intensity: s.intensity ?? null, notes: s.notes ?? null, rpe: s.rpe ?? null,
          status: 'planned', source: 'ai_routine',
        }))
        const { error } = await sb.from('planned_sessions').insert(rows)
        if (error) return errJ(error.message)
        return okJ({ page: 'Planning', added: rows.length })
      }

      case 'update_plan_periodisation': {
        const planId = str(inp.training_plan_id)
        if (!planId) return errJ('training_plan_id requis.')
        const { data, error } = await sb.from('training_plans')
          .update({ blocs_periodisation: inp.blocs_periodisation })
          .eq('id', planId).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Plan introuvable.')
        return okJ({ page: 'Planning', updated: 'periodisation' })
      }
    }
    return errJ(`Outil planning inconnu : ${name}`)
  } catch (e) {
    return errJ(e instanceof Error ? e.message : String(e))
  }
}
