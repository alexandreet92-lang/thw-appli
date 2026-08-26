// ══════════════════════════════════════════════════════════════════
// COACH SCALE TOOLS — l'IA aide le coach à piloter BEAUCOUP d'athlètes.
// Résolus CÔTÉ SERVEUR avec l'id du COACH (pas d'un athlète ciblé) :
//  • roster_overview : vue transversale du roster (qui court bientôt, qui
//    est en surcharge, qui n'a pas synchronisé, adhérence, blessures) ;
//  • message_athletes : envoie un message à un/plusieurs athlètes + notif.
// Sécurité : ne touchent QUE les athlètes liés (RLS coach_athlete accepté).
// ══════════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>
const okJ = (o: Record<string, unknown>) => JSON.stringify({ ok: true, ...o })
const errJ = (m: string) => JSON.stringify({ ok: false, error: m })
const ymd = (d: Date) => d.toISOString().slice(0, 10)
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null
}

export const coachScaleTools: Anthropic.Tool[] = [
  {
    name: 'roster_overview',
    description:
      "VUE D'ENSEMBLE du roster du COACH (tous ses athlètes liés). Renvoie, par athlète : nom, sports, objectif, " +
      "jours depuis la dernière activité, charge 7 j (TSS), blessures actives, prochaine course (jours restants), " +
      "adhérence de la semaine (séances faites/prévues) et un statut (ok / attention / blessé / inactif). " +
      "Utilise-le pour répondre à « qui est en surcharge ? », « qui court dans 15 jours ? », « qui n'a pas synchronisé ? », " +
      "faire un point global, ou choisir sur quels athlètes agir. Réservé au coach.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'message_athletes',
    description:
      "ENVOIE un message à UN ou PLUSIEURS athlètes du coach (messagerie coach), avec notification. " +
      "Cible par IDs (athlete_ids), par noms (athlete_names) ou tout le roster (to_all=true). " +
      "Utilise-le pour relancer, féliciter, prévenir, briefer. Réservé au coach. Vérifie l'identité des destinataires avant d'envoyer.",
    input_schema: {
      type: 'object',
      properties: {
        body:          { type: 'string',  description: 'Contenu du message (1–4000 caractères).' },
        athlete_ids:   { type: 'array', items: { type: 'string' }, description: 'UUIDs des athlètes destinataires (via roster_overview).' },
        athlete_names: { type: 'array', items: { type: 'string' }, description: 'Noms des destinataires (résolus sur le roster).' },
        to_all:        { type: 'boolean', description: 'Envoyer à TOUT le roster.' },
      },
      required: ['body'],
    },
  },
]

export const COACH_SCALE_TOOL_NAMES: ReadonlySet<string> = new Set(coachScaleTools.map(t => t.name))

async function acceptedAthleteIds(sb: SB, coachId: string): Promise<string[]> {
  const { data } = await sb.from('coach_athlete').select('athlete_id').eq('coach_id', coachId).eq('status', 'accepted')
  return (data ?? []).map((r: { athlete_id: string }) => r.athlete_id)
}

export async function resolveCoachScaleTool(name: string, input: Record<string, unknown>, sb: SB, coachId: string): Promise<string> {
  try {
    if (name === 'roster_overview') {
      const ids = await acceptedAthleteIds(sb, coachId)
      if (!ids.length) return okJ({ athletes: [], note: 'Aucun athlète lié à ce coach.' })
      const since30 = ymd(new Date(Date.now() - 30 * 86400000))
      const since7 = Date.now() - 7 * 86400000
      const monday = (() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return ymd(d) })()
      const today = ymd(new Date())
      const [prof, acts, injs, races, planned] = await Promise.all([
        sb.from('profiles').select('id, full_name, first_name, sports, level, main_goal').in('id', ids),
        sb.from('activities').select('user_id, started_at, tss').in('user_id', ids).gte('started_at', since30),
        sb.from('injuries').select('user_id, status').in('user_id', ids).eq('status', 'active'),
        sb.from('planned_races').select('user_id, name, date').in('user_id', ids).gte('date', today).order('date', { ascending: true }),
        sb.from('planned_sessions').select('user_id, status, week_start').in('user_id', ids).eq('week_start', monday),
      ])
      type P = { id: string; full_name?: string; first_name?: string; sports?: unknown; level?: string; main_goal?: string }
      const pmap = new Map<string, P>((prof.data ?? []).map((p: P) => [p.id, p]))
      const athletes = ids.map(id => {
        const p = pmap.get(id)
        const myActs = (acts.data ?? []).filter((a: { user_id: string }) => a.user_id === id)
        const last = myActs.reduce<string | null>((m, a: { started_at: string }) => (!m || a.started_at > m ? a.started_at : m), null)
        const tss7 = myActs.filter((a: { started_at: string }) => new Date(a.started_at).getTime() >= since7)
          .reduce((s: number, a: { tss?: number }) => s + (Number(a.tss) || 0), 0)
        const activeInjuries = (injs.data ?? []).filter((x: { user_id: string }) => x.user_id === id).length
        const nextRace = (races.data ?? []).find((r: { user_id: string }) => r.user_id === id) as { name: string; date: string } | undefined
        const wk = (planned.data ?? []).filter((s: { user_id: string }) => s.user_id === id)
        const adhTotal = wk.length
        const adhDone = wk.filter((s: { status: string }) => s.status === 'done').length
        const lastDays = daysSince(last)
        let status = 'ok'
        if (activeInjuries > 0) status = 'blessé'
        else if (lastDays !== null && lastDays >= 10) status = 'inactif'
        else if (adhTotal > 0 && adhDone / adhTotal < 0.4) status = 'attention'
        return {
          id, name: p?.full_name || p?.first_name || 'Athlète',
          sports: Array.isArray(p?.sports) ? p!.sports : [], goal: p?.main_goal ?? null,
          last_activity_days: lastDays, tss_7d: Math.round(tss7), active_injuries: activeInjuries,
          next_race: nextRace ? { name: nextRace.name, in_days: daysSince(nextRace.date) !== null ? -(daysSince(nextRace.date) as number) : null } : null,
          adherence: adhTotal ? `${adhDone}/${adhTotal}` : null, status,
        }
      })
      return okJ({ count: athletes.length, athletes })
    }

    if (name === 'message_athletes') {
      const body = typeof input.body === 'string' ? input.body.trim() : ''
      if (!body) return errJ('body requis.')
      if (body.length > 4000) return errJ('Message trop long (max 4000).')
      const linked = await acceptedAthleteIds(sb, coachId)
      if (!linked.length) return errJ('Aucun athlète lié.')
      const linkedSet = new Set(linked)
      let targets: string[] = []
      if (input.to_all === true) targets = linked
      else {
        if (Array.isArray(input.athlete_ids)) targets.push(...(input.athlete_ids as unknown[]).map(String).filter(x => linkedSet.has(x)))
        if (Array.isArray(input.athlete_names) && (input.athlete_names as unknown[]).length) {
          const names = (input.athlete_names as unknown[]).map(x => String(x).toLowerCase().trim())
          const { data: profs } = await sb.from('profiles').select('id, full_name, first_name').in('id', linked)
          for (const nm of names) {
            const hit = (profs ?? []).find((p: { id: string; full_name?: string; first_name?: string }) =>
              (p.full_name ?? '').toLowerCase().includes(nm) || (p.first_name ?? '').toLowerCase().includes(nm))
            if (hit) targets.push(hit.id)
          }
        }
      }
      targets = Array.from(new Set(targets))
      if (!targets.length) return errJ('Aucun destinataire valide (précise athlete_ids/athlete_names, ou to_all).')
      const rows = targets.map(aid => ({ coach_id: coachId, athlete_id: aid, sender_id: coachId, body }))
      const { error } = await sb.from('coach_messages').insert(rows)
      if (error) return errJ(error.message)
      const preview = body.length > 90 ? body.slice(0, 90) + '…' : body
      await Promise.all(targets.map(async aid => {
        try {
          await createNotification(sb, aid, { type: 'coach.message', title: 'Message de ton coach', body: preview, link: '/messages', dedupKey: null })
          await sendPushToUser(sb, aid, { title: 'Message de ton coach', body: preview, url: '/messages', tag: 'coach-message' })
        } catch { /* best-effort */ }
      }))
      return okJ({ page: 'Messages', sent_to: targets.length })
    }

    return errJ(`Outil coach inconnu : ${name}`)
  } catch (e) {
    return errJ(e instanceof Error ? e.message : String(e))
  }
}
