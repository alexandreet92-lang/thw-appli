// ══════════════════════════════════════════════════════════════
// Studio — ARCHITECTE : « décris ce que tu veux, l'IA construit le système ».
// ──────────────────────────────────────────────────────────────
// L'utilisateur décrit (texte ou dictée) le résultat attendu ; on demande à
// l'IA de composer un graphe (nœuds + fils) en utilisant les briques du
// Studio, on le met en page (autoLayout) et on renvoie aussi une explication
// en français de ce qui a été construit et pourquoi.
// ══════════════════════════════════════════════════════════════

import {
  genId, autoLayout,
  type StudioGraph, type StudioNode, type StudioEdge,
  type StudioNodeKind, type StudioModel, type StudioSourceKey, type StudioActionKey,
} from './graph'
import { extractJson } from './connectors'
import { callAgent } from './runner'

interface ArchNode {
  id: string
  kind: StudioNodeKind
  title: string
  role?: string
  model?: StudioModel
  sourceKey?: StudioSourceKey
  actionKey?: StudioActionKey
}
interface ArchPlan {
  name: string
  explanation: string
  nodes: ArchNode[]
  edges: { from: string; to: string }[]
}

const ARCHITECT_PROMPT = `Tu es l'ARCHITECTE du Studio d'agents d'une app de coaching sportif hybride.
Tu construis un système multi-agents (un graphe) à partir de la demande de l'utilisateur.

BRIQUES DISPONIBLES (kind) :
- "trigger" : point d'entrée UNIQUE et OBLIGATOIRE. Son "role" = l'objectif du système.
- "source" : lit une page de l'app. "sourceKey" ∈ "activities" (activités 30 j), "planning" (séances planifiées), "injuries" (blessures), "recovery" (check-ins récupération), "profile" (profil athlète). Pas de "role".
- "agent" : un coach IA spécialisé. "role" = son métier + sa mission, précis et actionnable. "model" ∈ "hermes" (rapide) | "athena" (équilibré) | "zeus" (max).
- "merge" : fusionne les contributions reçues en UNE réponse. "role" = consigne de synthèse. "model" pareil.
- "validation" : pause + accord de l'utilisateur avant de continuer. "role" = ce qu'on lui demande de vérifier.
- "action" : écrit dans l'app. "actionKey" = "planning_save" (enregistre des séances dans le Planning). À n'utiliser QUE si l'utilisateur veut enregistrer/planifier réellement — et le faire précéder d'un "validation" n'est pas nécessaire (l'action demande déjà l'accord).

RÈGLES :
- 3 à 7 nœuds. Un seul "trigger". Le graphe doit être connexe et SANS cycle.
- Mets les "source" utiles en entrée des agents concernés (fils source → agent).
- Deux agents en parallèle valent mieux qu'un agent fourre-tout quand la demande a plusieurs facettes.
- Termine par un "merge" (ou un "action" si l'utilisateur veut écrire dans l'app).
- Titres courts (2-3 mots), rôles en français, concrets.

RÉPONDS UNIQUEMENT avec un objet JSON (aucun texte autour) :
{"name":"Nom court du système","explanation":"2-4 phrases en français : ce que fait le système, qui fait quoi, pourquoi ce découpage.","nodes":[{"id":"n1","kind":"trigger","title":"Objectif","role":"…"},…],"edges":[{"from":"n1","to":"n2"},…]}

DEMANDE DE L'UTILISATEUR :
`

export interface ArchitectResult {
  graph: StudioGraph
  explanation: string
}

export async function buildGraphFromDescription(
  description: string,
  current?: StudioGraph,
  onProgress?: (t: string) => void,
  signal?: AbortSignal,
): Promise<ArchitectResult> {
  const pseudoNode: StudioNode = { id: 'arch', kind: 'agent', title: 'Architecte', x: 0, y: 0, model: 'athena' }

  // Mode MODIFICATION : un système existe → l'architecte le fait évoluer au
  // lieu de repartir de zéro (sauf si la demande décrit un système tout neuf).
  let contextBlock = ''
  if (current && current.nodes.length > 0) {
    const slim = {
      nodes: current.nodes.map(n => ({ id: n.id, kind: n.kind, title: n.title, role: n.role?.slice(0, 300), model: n.model, sourceKey: n.sourceKey, actionKey: n.actionKey })),
      edges: current.edges.map(e => ({ from: e.from, to: e.to })),
    }
    contextBlock =
      `\n\nUN SYSTÈME EXISTE DÉJÀ (ci-dessous). Si la demande de l'utilisateur est une MODIFICATION (ajouter/retirer/changer un agent, une source, un fil…), pars de ce graphe et renvoie le graphe COMPLET mis à jour en conservant tout ce qui n'est pas concerné (mêmes ids pour les nœuds gardés). Si la demande décrit un système entièrement différent, repars de zéro.\n\nGRAPHE EXISTANT :\n${JSON.stringify(slim)}\n`
  }

  const raw = await callAgent(pseudoNode, ARCHITECT_PROMPT + contextBlock + '\n' + description.trim(), onProgress ?? (() => {}), signal)
  const plan = extractJson<ArchPlan>(raw)

  if (!plan || !Array.isArray(plan.nodes) || plan.nodes.length === 0) {
    throw new Error("L'architecte n'a pas renvoyé de graphe exploitable — reformule ta demande.")
  }

  // Remap des ids IA → ids réels, et validation défensive des kinds/refs.
  const KINDS: StudioNodeKind[] = ['trigger', 'agent', 'merge', 'validation', 'source', 'action']
  const idMap = new Map<string, string>()
  const nodes: StudioNode[] = []
  for (const an of plan.nodes.slice(0, 8)) {
    if (!an || !KINDS.includes(an.kind)) continue
    const nid = genId()
    idMap.set(String(an.id), nid)
    nodes.push({
      id: nid,
      kind: an.kind,
      title: String(an.title ?? '').slice(0, 40) || an.kind,
      x: 0, y: 0,
      role: an.role ? String(an.role).slice(0, 900) : undefined,
      model: an.kind === 'agent' || an.kind === 'merge' || an.kind === 'action'
        ? (['hermes', 'athena', 'zeus'].includes(String(an.model)) ? an.model : 'athena')
        : undefined,
      sourceKey: an.kind === 'source'
        ? (['activities', 'planning', 'injuries', 'recovery', 'profile'].includes(String(an.sourceKey)) ? an.sourceKey : 'activities')
        : undefined,
      actionKey: an.kind === 'action' ? 'planning_save' : undefined,
    })
  }
  if (!nodes.some(n => n.kind === 'trigger')) {
    nodes.unshift({ id: genId(), kind: 'trigger', title: 'Objectif', x: 0, y: 0, role: description.trim().slice(0, 400) })
  }

  const nodeIds = new Set(nodes.map(n => n.id))
  const edges: StudioEdge[] = []
  for (const e of (plan.edges ?? [])) {
    const from = idMap.get(String(e?.from)); const to = idMap.get(String(e?.to))
    if (from && to && from !== to && nodeIds.has(from) && nodeIds.has(to)
      && !edges.some(x => x.from === from && x.to === to)) {
      edges.push({ id: genId(), from, to })
    }
  }
  // Filet : si l'IA a oublié des fils, relier le trigger aux nœuds orphelins d'entrée.
  const hasIn = new Set(edges.map(e => e.to))
  const trig = nodes.find(n => n.kind === 'trigger')!
  for (const n of nodes) {
    if (n.id !== trig.id && n.kind !== 'source' && !hasIn.has(n.id)) {
      edges.push({ id: genId(), from: trig.id, to: n.id })
    }
  }

  const graph: StudioGraph = {
    id: genId(),
    name: String(plan.name ?? 'Système généré').slice(0, 60),
    nodes: autoLayout(nodes, edges),
    edges,
    updatedAt: Date.now(),
  }
  return { graph, explanation: String(plan.explanation ?? '').slice(0, 800) }
}
