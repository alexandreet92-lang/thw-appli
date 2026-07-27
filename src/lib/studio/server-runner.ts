// ══════════════════════════════════════════════════════════════
// Studio — RUNNER SERVEUR pour les runs AUTONOMES (planifiés).
// ──────────────────────────────────────────────────────────────
// Même parcours par couches que le runner navigateur, mais :
//  • sources lues avec le service client (readSourceWith + userId) ;
//  • agents/synthèses = appel Anthropic DIRECT (pas de coach-stream) ;
//  • AUCUN nœud validation/action : un run autonome ne peut pas attendre
//    un accord humain — le planificateur refuse ces systèmes en amont ;
//  • conso débitée sur le solde STUDIO (recordStudioUsage, runId).
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'
import { getModelMultiplier } from '@/lib/tokens/multipliers'
import { recordStudioUsage } from '@/lib/tokens/studio'
import { readSourceWith } from './source-readers'
import { SOURCE_LABEL, type StudioGraph } from './graph'

const MODEL_BY_KEY: Record<string, string> = {
  hermes: MODELS.fast,
  athena: MODELS.balanced,
  zeus:   MODELS.powerful,
}

const SYSTEM_PROMPT =
  `Tu es un agent d'un SYSTÈME AUTOMATISÉ du Studio de THW Coaching (coaching sportif hybride endurance + force), défini par l'athlète lui-même. ` +
  `Exécute ton rôle de façon autonome et complète, en te basant UNIQUEMENT sur les données réelles reçues en entrée. ` +
  `Écris en français, clair, concret et actionnable. N'invente jamais de données ; si une donnée manque, dis-le brièvement.`

export interface ServerRunResult {
  renders: { title: string; text: string }[]
  logs: { nodeId: string; title: string; text: string }[]
  errors: { title: string; message: string }[]
  weightedTokens: number
}

// ── SYSTÈME VIVANT — Mémoire inter-cycles ─────────────────────────────────
// Relit la synthèse du dernier run RÉUSSI de ce système : l'IA sait ce qu'elle
// a prescrit au cycle précédent et peut vérifier l'adhérence + progresser.
async function readLastCycleMemory(sb: ReturnType<typeof createServiceClient>, systemId: string | undefined): Promise<string> {
  if (!systemId) return ''
  try {
    const { data } = await sb.from('studio_runs')
      .select('renders, finished_at')
      .eq('system_id', systemId).eq('status', 'done')
      .order('finished_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return ''
    const renders = (data.renders ?? []) as { title?: string; text?: string }[]
    const txt = renders.map(r => (r?.text ?? '').trim()).filter(Boolean).join('\n\n')
    return txt.slice(0, 2500)
  } catch { return '' }
}

// ── SYSTÈME VIVANT — Garde-fou santé transversal ──────────────────────────
// Blessure active OU récupération au plancher (7 j) → l'IA DOIT brider la
// charge, quel que soit l'objectif. La sécurité prime.
async function readHealthGuard(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<string> {
  const bits: string[] = []
  try {
    const { data: inj } = await sb.from('injuries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
    const RESOLVED = ['guérie', 'guerie', 'resolved', 'résolue', 'resolue', 'terminée', 'terminee']
    const active = ((inj ?? []) as Record<string, unknown>[]).filter(b => {
      const end = b.date_fin ?? b.resolved_date
      const status = String(b.status ?? '').toLowerCase()
      return !end && !RESOLVED.includes(status)
    })
    if (active.length) {
      const names = active.map(b => String(b.nom ?? b.name ?? b.title ?? b.zone ?? 'zone')).slice(0, 4).join(', ')
      bits.push(`blessure(s) active(s) : ${names}`)
    }
  } catch { /* best-effort */ }
  try {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    const { data: rec } = await sb.from('recovery_checkin').select('sleep_quality,fatigue,soreness').eq('user_id', userId).gte('date', since)
    const rows = (rec ?? []) as Record<string, number | null>[]
    if (rows.length >= 2) {
      const avg = (k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) / rows.length
      const fatigue = avg('fatigue'), soreness = avg('soreness'), sleep = avg('sleep_quality')
      if (fatigue >= 4 || soreness >= 4 || (sleep > 0 && sleep <= 2)) {
        bits.push('récupération au plancher (fatigue/courbatures élevées ou sommeil bas sur 7 jours)')
      }
    }
  } catch { /* best-effort */ }
  if (!bits.length) return ''
  return `\n\n⚠️ GARDE-FOU SANTÉ ACTIF — ${bits.join(' ; ')}. Tu DOIS brider la charge : privilégie le repos ou une semaine d'allègement, évite toute intensité ou volume élevés, adapte ou reporte les séances dures, et explique clairement pourquoi. La sécurité de l'athlète prime sur l'objectif.`
}

export async function runGraphServer(userId: string, graph: StudioGraph, runId: string, systemId?: string): Promise<ServerRunResult> {
  const sb = createServiceClient()
  // Contexte « système vivant » partagé par tous les agents de ce cycle.
  const [memory, healthGuard] = await Promise.all([
    readLastCycleMemory(sb, systemId),
    readHealthGuard(sb, userId),
  ])
  const client = getAnthropicClient()
  const nodes = graph.nodes
  const byId = new Map(nodes.map(n => [n.id, n]))
  const deps = new Map<string, Set<string>>()
  const incoming = new Map<string, string[]>()
  for (const n of nodes) { deps.set(n.id, new Set()); incoming.set(n.id, []) }
  for (const e of graph.edges) {
    if (byId.has(e.from) && byId.has(e.to)) {
      deps.get(e.to)!.add(e.from)
      incoming.get(e.to)!.push(e.from)
    }
  }

  const outputs: Record<string, string> = {}
  const done = new Set<string>()
  const failed = new Set<string>()
  const skipped = new Set<string>()
  const logs: ServerRunResult['logs'] = []
  const errors: ServerRunResult['errors'] = []
  let weightedTokens = 0

  const gatherUpstream = (nodeId: string): string =>
    (incoming.get(nodeId) ?? [])
      .map(src => {
        const s = byId.get(src)
        const out = outputs[src] ?? ''
        return s && out ? `[De : ${s.title}]\n${out}` : out
      })
      .filter(Boolean)
      .join('\n\n')

  const callAgentServer = async (modelKey: string, userContent: string): Promise<string> => {
    const resp: Anthropic.Message = await client.messages.create({
      model: MODEL_BY_KEY[modelKey] ?? MODELS.balanced,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    const raw = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0)
    weightedTokens += Math.ceil(raw * getModelMultiplier(modelKey))
    void recordStudioUsage(userId, raw, modelKey, runId)
    return resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
      .trim()
  }

  let guard = 0
  while (done.size + failed.size + skipped.size < nodes.length && guard++ < 40) {
    const pending = nodes.filter(n => !done.has(n.id) && !failed.has(n.id) && !skipped.has(n.id))
    const toSkip = pending.filter(n => [...deps.get(n.id)!].some(d => failed.has(d) || skipped.has(d)))
    if (toSkip.length) { toSkip.forEach(n => skipped.add(n.id)); continue }
    const ready = pending.filter(n => [...deps.get(n.id)!].every(d => done.has(d)))
    if (ready.length === 0) break   // cycle / inatteignable — validé en amont normalement

    await Promise.all(ready.map(async n => {
      try {
        if (n.kind === 'trigger') {
          outputs[n.id] = (n.role ?? '').trim()
        } else if (n.kind === 'source') {
          const key = n.sourceKey ?? 'activities'
          const text = await readSourceWith(sb, userId, key)
          outputs[n.id] = text
          logs.push({ nodeId: n.id, title: `${n.title} (${SOURCE_LABEL[key]})`, text })
        } else if (n.kind === 'action' && n.actionKey === 'notify_report') {
          // Seule action autorisée en autonome : le rapport à notifier = le
          // contenu amont (le planificateur enverra la notification).
          const upstream = gatherUpstream(n.id)
          if (!upstream.trim()) throw new Error('Aucun contenu à envoyer en notification')
          outputs[n.id] = upstream
          logs.push({ nodeId: n.id, title: n.title, text: upstream })
        } else if (n.kind === 'validation' || n.kind === 'action') {
          throw new Error('Nœud Validation/écriture (Planning/Calendrier) non exécutable en run autonome — accord humain requis')
        } else {
          const upstream = gatherUpstream(n.id)
          const role = (n.role ?? '').trim() || 'Tu es un coach expert. Réponds de façon claire, concrète et actionnable.'
          // Contexte système vivant : garde-fou santé + mémoire du dernier cycle.
          const living = `${healthGuard}${memory ? `\n\n--- MÉMOIRE : ta synthèse du dernier cycle (vérifie l'adhérence, ajuste et progresse) ---\n${memory}\n--- fin mémoire ---` : ''}`
          const prompt = upstream
            ? `${role}${living}\n\n--- Contributions et données reçues en entrée ---\n${upstream}\n\n--- Fin des entrées ---\n\nProduis ta contribution maintenant.`
            : `${role}${living}`
          const text = await callAgentServer(n.model ?? 'athena', prompt)
          outputs[n.id] = text
          logs.push({ nodeId: n.id, title: n.title, text })
        }
        done.add(n.id)
      } catch (e) {
        failed.add(n.id)
        const message = e instanceof Error ? e.message : 'Erreur inconnue'
        errors.push({ title: n.title, message })
        logs.push({ nodeId: n.id, title: `${n.title} — en erreur`, text: message })
      }
    }))
  }

  // Rendus = nœuds terminaux (sans fil sortant), hors trigger.
  const hasOut = new Set(graph.edges.map(e => e.from))
  const renders = nodes
    .filter(n => n.kind !== 'trigger' && !hasOut.has(n.id))
    .map(n => ({ title: n.title, text: outputs[n.id] ?? '' }))

  return { renders, logs, errors, weightedTokens }
}
