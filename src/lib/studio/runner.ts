// ══════════════════════════════════════════════════════════════
// Studio d'agents — moteur d'exécution CÔTÉ NAVIGATEUR (MVP « Run once »).
// ──────────────────────────────────────────────────────────────
// Parcourt le graphe par COUCHES : à chaque tour, on lance en parallèle tous
// les nœuds dont toutes les entrées sont prêtes → les agents travaillent
// réellement en même temps. Chaque agent appelle /api/coach-stream (session
// utilisateur via cookies) et sa réponse alimente les nœuds en aval.
//
// L'autonomie planifiée (tourner sans l'utilisateur, tous les jours à 7h)
// déplacera cette logique côté serveur (Edge Functions + cron) — plus tard.
// ══════════════════════════════════════════════════════════════

import type { StudioGraph, StudioNode, StudioModel } from './graph'

export type NodeStatus = 'idle' | 'running' | 'waiting' | 'done' | 'error' | 'skipped'

export interface RunCallbacks {
  onStatus: (nodeId: string, status: NodeStatus) => void
  onChunk:  (nodeId: string, textSoFar: string) => void
  onLog:    (entry: { nodeId: string; title: string; text: string }) => void
  // Nœud « Validation » : renvoie true pour continuer, false pour arrêter.
  requestApproval: (node: StudioNode, content: string) => Promise<boolean>
  signal?: AbortSignal
}

// ── Appel d'un agent : /api/coach-stream, accumulation du flux SSE ────────
async function callAgent(
  node: StudioNode,
  upstream: string,
  onChunk: (t: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const model: StudioModel = node.model ?? 'athena'
  const role = (node.role ?? '').trim() || 'Tu es un coach expert. Réponds de façon claire, concrète et actionnable.'

  const userContent = upstream
    ? `${role}\n\n--- Contributions reçues des autres agents ---\n${upstream}\n\n--- Fin des contributions ---\n\nProduis ta contribution maintenant.`
    : role

  const res = await fetch('/api/coach-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      agentId: 'central',
      modelId: model,
      messages: [{ role: 'user', content: userContent }],
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

// ── Exécution du graphe par couches (parallélisme réel) ───────────────────
export async function runGraph(graph: StudioGraph, cb: RunCallbacks): Promise<Record<string, string>> {
  const nodes = graph.nodes
  const byId = new Map(nodes.map(n => [n.id, n]))
  // Dépendances : pour chaque nœud, l'ensemble de ses sources amont.
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

  while (done.size < nodes.length) {
    if (cb.signal?.aborted) throw new Error('Exécution interrompue')

    const ready = nodes.filter(n => !done.has(n.id) && [...deps.get(n.id)!].every(d => done.has(d)))
    if (ready.length === 0) throw new Error('Cycle détecté ou nœud non atteignable dans le graphe')

    await Promise.all(ready.map(async n => {
      cb.onStatus(n.id, 'running')
      try {
        if (n.kind === 'trigger') {
          outputs[n.id] = (n.role ?? '').trim()
        } else if (n.kind === 'validation') {
          const content = gatherUpstream(n.id)
          cb.onStatus(n.id, 'waiting')
          const ok = await cb.requestApproval(n, content)
          if (!ok) throw new Error('Validation refusée par l’utilisateur')
          outputs[n.id] = content
        } else {
          // agent | merge → appel IA
          const upstream = gatherUpstream(n.id)
          const text = await callAgent(n, upstream, t => cb.onChunk(n.id, t), cb.signal)
          outputs[n.id] = text
          cb.onLog({ nodeId: n.id, title: n.title, text })
        }
        cb.onStatus(n.id, 'done')
        done.add(n.id)
      } catch (e) {
        cb.onStatus(n.id, 'error')
        throw e
      }
    }))
  }

  return outputs
}

// Nœuds terminaux (sans fil sortant) → ce sont les « rendus » du graphe.
export function terminalNodeIds(graph: StudioGraph): string[] {
  const hasOut = new Set(graph.edges.map(e => e.from))
  return graph.nodes.filter(n => n.kind !== 'trigger' && !hasOut.has(n.id)).map(n => n.id)
}
