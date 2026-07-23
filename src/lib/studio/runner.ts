// ══════════════════════════════════════════════════════════════
// Studio d'agents — moteur d'exécution CÔTÉ NAVIGATEUR (MVP « Run once »).
// ──────────────────────────────────────────────────────────────
// Parcourt le graphe par COUCHES : à chaque tour, on lance en parallèle tous
// les nœuds dont toutes les entrées sont prêtes → les agents travaillent
// réellement en même temps. Nœuds :
//  • trigger    → émet l'objectif.
//  • source     → lit les vraies données d'une page de l'app (connectors.ts).
//  • agent/merge→ appel IA /api/coach-stream (streaming, session utilisateur).
//  • validation → pause + accord utilisateur.
//  • action     → écrit dans l'app (ex. Planning) — TOUJOURS après accord
//                 utilisateur explicite, jamais en silence.
//
// L'autonomie planifiée (tourner sans l'utilisateur) déplacera cette logique
// côté serveur (Edge Functions + cron) — phase suivante.
// ══════════════════════════════════════════════════════════════

import type { StudioGraph, StudioNode, StudioModel } from './graph'
import { SOURCE_LABEL } from './graph'
import {
  readSource, savePlanningSessions, describeDrafts, extractJson,
  type PlanningSessionDraft,
} from './connectors'

export type NodeStatus = 'idle' | 'running' | 'waiting' | 'done' | 'error' | 'skipped'

export interface RunCallbacks {
  onStatus: (nodeId: string, status: NodeStatus) => void
  onChunk:  (nodeId: string, textSoFar: string) => void
  onLog:    (entry: { nodeId: string; title: string; text: string }) => void
  // Validation / action : renvoie true pour continuer, false pour arrêter.
  requestApproval: (node: StudioNode, content: string) => Promise<boolean>
  signal?: AbortSignal
  // Identifiant du run : la conso serveur (studio_usage) y est rattachée →
  // permet d'afficher le COÛT RÉEL du run une fois terminé.
  runId?: string
}

// ── Appel d'un agent : /api/coach-stream, accumulation du flux SSE ────────
async function callAgent(
  node: StudioNode,
  userContent: string,
  onChunk: (t: string) => void,
  signal?: AbortSignal,
  runId?: string,
): Promise<string> {
  const model: StudioModel = node.model ?? 'athena'

  const res = await fetch('/api/coach-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      agentId: 'central',
      modelId: model,
      messages: [{ role: 'user', content: userContent }],
      // Comptabilité SÉPARÉE : les runs Studio débitent le solde Studio,
      // jamais le quota chat (voir coach-stream).
      studio: true,
      runId,
    }),
  })

  if (!res.ok || !res.body) {
    let err = `HTTP ${res.status}`
    try { const d = await res.json() as { error?: string }; if (d?.error) err = d.error } catch { /* ignore */ }
    throw new Error(err)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let acc = ''
  let buf = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const raw of parts) {
      if (!raw.trim()) continue
      let type = 'text'
      let data = ''
      for (const line of raw.split('\n')) {
        if (line.startsWith('event: ')) type = line.slice(7).trim()
        else if (line.startsWith('data: ')) data = line.slice(6)
      }
      if (type === 'text') {
        try { acc += JSON.parse(data) as string } catch { acc += data }
        onChunk(acc)
      }
    }
  }
  return acc.trim()
}

function agentPrompt(node: StudioNode, upstream: string): string {
  const role = (node.role ?? '').trim() || 'Tu es un coach expert. Réponds de façon claire, concrète et actionnable.'
  return upstream
    ? `${role}\n\n--- Contributions et données reçues en entrée ---\n${upstream}\n\n--- Fin des entrées ---\n\nProduis ta contribution maintenant.`
    : role
}

// Lundi de la semaine prochaine (repère donné à l'IA pour planifier).
function nextMondayISO(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7      // 0 = lundi
  d.setDate(d.getDate() + (7 - day))
  return d.toISOString().slice(0, 10)
}

// ── Exécution du graphe par couches (parallélisme réel) ───────────────────
// Résilience : l'erreur d'un nœud ne tue PAS le run — le nœud passe en
// « error », ses descendants en « skipped », et les autres branches continuent.
// Seul un abort (bouton Arrêter) interrompt tout.
export interface RunResult {
  outputs: Record<string, string>
  errors: { nodeId: string; title: string; message: string }[]
}

export async function runGraph(graph: StudioGraph, cb: RunCallbacks): Promise<RunResult> {
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
  const errors: RunResult['errors'] = []
  nodes.forEach(n => cb.onStatus(n.id, 'idle'))

  const gatherUpstream = (nodeId: string): string =>
    (incoming.get(nodeId) ?? [])
      .map(src => {
        const s = byId.get(src)
        const out = outputs[src] ?? ''
        return s && out ? `[De : ${s.title}]\n${out}` : out
      })
      .filter(Boolean)
      .join('\n\n')

  while (done.size + failed.size + skipped.size < nodes.length) {
    if (cb.signal?.aborted) throw new Error('Exécution interrompue')

    const pending = nodes.filter(n => !done.has(n.id) && !failed.has(n.id) && !skipped.has(n.id))
    // Descendants d'un nœud en erreur / sauté → sautés à leur tour.
    const toSkip = pending.filter(n => [...deps.get(n.id)!].some(d => failed.has(d) || skipped.has(d)))
    if (toSkip.length) {
      toSkip.forEach(n => { skipped.add(n.id); cb.onStatus(n.id, 'skipped') })
      continue
    }
    const ready = pending.filter(n => [...deps.get(n.id)!].every(d => done.has(d)))
    if (ready.length === 0) throw new Error('Cycle détecté ou nœud non atteignable dans le graphe')

    await Promise.all(ready.map(async n => {
      cb.onStatus(n.id, 'running')
      try {
        if (n.kind === 'trigger') {
          outputs[n.id] = (n.role ?? '').trim()

        } else if (n.kind === 'source') {
          const key = n.sourceKey ?? 'activities'
          const text = await readSource(key)
          outputs[n.id] = text
          cb.onChunk(n.id, text)
          cb.onLog({ nodeId: n.id, title: `${n.title} (${SOURCE_LABEL[key]})`, text })

        } else if (n.kind === 'validation') {
          const content = gatherUpstream(n.id)
          cb.onStatus(n.id, 'waiting')
          const ok = await cb.requestApproval(n, content)
          if (!ok) throw new Error('Validation refusée par l’utilisateur')
          outputs[n.id] = content

        } else if (n.kind === 'action') {
          // Action « Enregistrer dans le Planning » : l'IA structure d'abord
          // les séances, PUIS l'utilisateur valide explicitement, PUIS on écrit.
          const upstream = gatherUpstream(n.id)
          const prompt =
            `Tu convertis un plan d'entraînement en JSON STRICT pour insertion en base.\n` +
            `Réponds UNIQUEMENT avec un tableau JSON (aucun texte autour) d'objets :\n` +
            `{"week_start":"YYYY-MM-DD (un LUNDI)","day_index":0-6 (0=lundi),"sport":"run|bike|gym|hyrox|swim|trail_run|other","title":"…","duration_min":60,"intensity":"Z2|tempo|seuil|VMA|force|…","notes":"…"}\n` +
            `Le lundi de la semaine prochaine est le ${nextMondayISO()} — planifie à partir de là sauf indication contraire.\n` +
            `Maximum 10 séances.\n\n--- Plan à convertir ---\n${upstream}`
          const raw = await callAgent({ ...n, model: n.model ?? 'hermes' }, prompt, t => cb.onChunk(n.id, t), cb.signal, cb.runId)
          const drafts = extractJson<PlanningSessionDraft[]>(raw)
          if (!Array.isArray(drafts) || drafts.length === 0) throw new Error('Aucune séance exploitable dans le plan reçu')
          const summary = describeDrafts(drafts.slice(0, 10))
          cb.onStatus(n.id, 'waiting')
          const ok = await cb.requestApproval(n, `Séances prêtes à être enregistrées dans ton Planning :\n\n${summary}`)
          if (!ok) throw new Error('Écriture dans le Planning refusée par l’utilisateur')
          const count = await savePlanningSessions(drafts.slice(0, 10))
          const doneMsg = `✓ ${count} séance(s) enregistrée(s) dans le Planning.\n\n${summary}`
          outputs[n.id] = doneMsg
          cb.onChunk(n.id, doneMsg)
          cb.onLog({ nodeId: n.id, title: n.title, text: doneMsg })

        } else {
          // agent | merge → appel IA
          const upstream = gatherUpstream(n.id)
          const text = await callAgent(n, agentPrompt(n, upstream), t => cb.onChunk(n.id, t), cb.signal, cb.runId)
          outputs[n.id] = text
          cb.onLog({ nodeId: n.id, title: n.title, text })
        }
        cb.onStatus(n.id, 'done')
        done.add(n.id)
      } catch (e) {
        if (cb.signal?.aborted) throw e
        const message = e instanceof Error ? e.message : 'Erreur inconnue'
        cb.onStatus(n.id, 'error')
        failed.add(n.id)
        errors.push({ nodeId: n.id, title: n.title, message })
        cb.onLog({ nodeId: n.id, title: `${n.title} — en erreur`, text: message })
      }
    }))
  }

  return { outputs, errors }
}

// Nœuds terminaux (sans fil sortant) → ce sont les « rendus » du graphe.
export function terminalNodeIds(graph: StudioGraph): string[] {
  const hasOut = new Set(graph.edges.map(e => e.from))
  return graph.nodes.filter(n => n.kind !== 'trigger' && !hasOut.has(n.id)).map(n => n.id)
}

export { callAgent }
