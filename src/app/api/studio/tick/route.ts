// ══════════════════════════════════════════════════════════════
// CRON horaire des systèmes Studio planifiés (Vercel Cron, CRON_SECRET).
// Pour chaque planification ACTIVE dont l'heure locale + le jour matchent :
//  • refuse les systèmes avec Validation/Action (accord humain requis) ;
//  • vérifie l'accès (Pro/Expert) et le solde Studio (estimation) ;
//  • exécute le graphe côté serveur, archive le run, notifie l'athlète.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push/send'
import { getStudioAccess } from '@/lib/tokens/studio'
import { runGraphServer } from '@/lib/studio/server-runner'
import { validateGraph, genId, type StudioGraph } from '@/lib/studio/graph'
import { estimateRunTokens, formatTokens } from '@/lib/studio/offers'

interface ScheduleRow {
  id: string
  user_id: string
  system_id: string
  frequency: 'daily' | 'weekly'
  hour: number
  weekday: number | null
  timezone: string
  enabled: boolean
  last_run_at: string | null
}

// Heure (0-23) et jour de semaine (lundi=0) dans le fuseau de la planification.
function localParts(tz: string, now: Date): { hour: number; weekdayMon: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10) % 24
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
    const weekdayMon = map[parts.find(p => p.type === 'weekday')?.value ?? 'Mon'] ?? 0
    return { hour, weekdayMon }
  } catch {
    return { hour: now.getUTCHours(), weekdayMon: (now.getUTCDay() + 6) % 7 }
  }
}

function isDue(s: ScheduleRow, now: Date): boolean {
  const { hour, weekdayMon } = localParts(s.timezone || 'Europe/Paris', now)
  if (hour !== s.hour) return false
  if (s.frequency === 'weekly' && weekdayMon !== (s.weekday ?? 0)) return false
  // Anti-doublon : déjà lancé dans les 50 dernières minutes → on saute.
  if (s.last_run_at && now.getTime() - new Date(s.last_run_at).getTime() < 50 * 60 * 1000) return false
  return true
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()
  const now = new Date()
  const { data: schedules } = await sb
    .from('studio_schedules')
    .select('id, user_id, system_id, frequency, hour, weekday, timezone, enabled, last_run_at')
    .eq('enabled', true)

  const due = ((schedules ?? []) as ScheduleRow[]).filter(s => isDue(s, now))
  let launched = 0

  for (const sched of due) {
    // Marque tout de suite (anti-doublon si le tick suivant démarre pendant un run long).
    await sb.from('studio_schedules').update({ last_run_at: now.toISOString() }).eq('id', sched.id)

    try {
      const { data: system } = await sb
        .from('studio_systems')
        .select('id, name, graph')
        .eq('id', sched.system_id)
        .maybeSingle()
      if (!system) continue
      const graph = system.graph as StudioGraph
      const name = (system.name as string) || 'Système Studio'

      // ── Système vivant : objectif échu → pause + demande du prochain objectif ──
      const deadline = graph.objective?.deadline
      if (deadline) {
        const end = new Date(`${deadline}T23:59:59`)
        if (!isNaN(end.getTime()) && now.getTime() > end.getTime()) {
          // Met le système en pause (planification désactivée) — une seule fois.
          await sb.from('studio_schedules').update({ enabled: false }).eq('id', sched.id)
          await createNotification(sb, sched.user_id, {
            type: 'studio.schedule',
            title: `« ${name} » : objectif atteint`,
            body: `Ton objectif « ${graph.objective!.text} » est arrivé à échéance. Le système est en pause — ouvre le Studio pour définir ton prochain objectif et le relancer.`,
            link: '/',
            dedupKey: `studio-obj-expired-${sched.system_id}-${deadline}`,
          })
          await sendPushToUser(sb, sched.user_id, {
            title: 'Studio : objectif atteint',
            body: `« ${name} » est en pause. Définis ton prochain objectif.`,
            url: '/',
            tag: `studio-obj-${sched.system_id}`,
          })
          continue
        }
      }

      // Garde-fous : graphe valide + pas d'action qui écrit/valide sans toi.
      // Exception : « notify_report » (envoi d'une notification) est sûr en
      // autonome → un système vivant peut t'envoyer sa synthèse chaque cycle.
      const v = validateGraph(graph)
      const needsHuman = graph.nodes.some(n => n.kind === 'validation' || (n.kind === 'action' && n.actionKey !== 'notify_report'))
      if (v.errors.length > 0 || needsHuman) {
        await createNotification(sb, sched.user_id, {
          type: 'studio.schedule',
          title: `« ${name} » n'a pas pu tourner`,
          body: needsHuman
            ? 'Ce système contient un bloc Validation ou une écriture (Planning / Calendrier) qui nécessite ton accord : il ne peut pas tourner tout seul. Pour la planification, termine plutôt par une Notification.'
            : `Le système est invalide : ${v.errors[0]}`,
          link: '/',
          dedupKey: `studio-sched-invalid-${sched.id}`,
        })
        continue
      }

      const access = await getStudioAccess(sched.user_id)
      const estimate = estimateRunTokens(graph.nodes)
      if (!access.allowed || estimate > access.remaining) {
        await createNotification(sb, sched.user_id, {
          type: 'studio.schedule',
          title: `« ${name} » n'a pas pu tourner`,
          body: !access.allowed
            ? 'Le Studio nécessite un abonnement Pro ou Expert.'
            : `Solde Studio insuffisant (~${formatTokens(estimate)} tokens nécessaires). Recharge avec un pack.`,
          link: '/',
          dedupKey: `studio-sched-balance-${sched.id}-${now.toISOString().slice(0, 10)}`,
        })
        continue
      }

      // Run serveur + archivage + notification.
      const runId = genId()
      const res = await runGraphServer(sched.user_id, graph, runId)
      const status = res.errors.length > 0 ? 'error' : 'done'
      await sb.from('studio_runs').insert({
        id: runId,
        user_id: sched.user_id,
        system_id: sched.system_id,
        system_name: name,
        status,
        logs: res.logs,
        renders: res.renders,
        error_text: res.errors.length ? res.errors.map(e => `${e.title} — ${e.message}`).join(' · ') : null,
        tokens_est: res.weightedTokens,
        finished_at: new Date().toISOString(),
      })

      const preview = res.renders.find(r => r.text)?.text?.slice(0, 110) ?? ''
      const body = status === 'done'
        ? `Run automatique terminé (${formatTokens(res.weightedTokens)} tokens). ${preview}${preview.length >= 110 ? '…' : ''}`
        : 'Run automatique terminé avec des erreurs — ouvre l’historique du Studio pour le détail.'
      await createNotification(sb, sched.user_id, {
        type: 'studio.schedule',
        title: `« ${name} » a tourné`,
        body,
        link: '/',
        dedupKey: `studio-sched-run-${runId}`,
      })
      await sendPushToUser(sb, sched.user_id, {
        title: `Studio : « ${name} » a tourné`,
        body,
        url: '/',
        tag: `studio-sched-${sched.id}`,
      })
      launched++
    } catch (e) {
      console.error('[studio/tick] schedule failed:', sched.id, e)
    }
  }

  return NextResponse.json({ checked: (schedules ?? []).length, due: due.length, launched })
}
