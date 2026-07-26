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

export interface ArchNode {
  id: string
  kind: StudioNodeKind
  title: string
  role?: string
  model?: StudioModel
  sourceKey?: StudioSourceKey
  actionKey?: StudioActionKey
}
export interface ArchPlan {
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
- "action" : écrit dans l'app. "actionKey" ∈ "planning_save" (enregistre des séances dans le Planning) | "calendar_race" (ajoute une course/objectif daté au Calendrier) | "notify_report" (envoie le résultat en notification, pour les rapports à consulter plus tard). À n'utiliser QUE si l'utilisateur veut réellement écrire dans l'app — et le faire précéder d'un "validation" n'est pas nécessaire (l'action demande déjà l'accord).

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

// Contexte « un système existe déjà » injecté dans les prompts.
function existingGraphBlock(current?: StudioGraph): string {
  if (!current || current.nodes.length === 0) return ''
  const slim = {
    nodes: current.nodes.map(n => ({ id: n.id, kind: n.kind, title: n.title, role: n.role?.slice(0, 300), model: n.model, sourceKey: n.sourceKey, actionKey: n.actionKey })),
    edges: current.edges.map(e => ({ from: e.from, to: e.to })),
  }
  return `\n\nUN SYSTÈME EXISTE DÉJÀ (ci-dessous). Si la demande est une MODIFICATION (ajouter/retirer/changer un agent, une source, un fil…), pars de ce graphe et renvoie le graphe COMPLET mis à jour en conservant tout ce qui n'est pas concerné (mêmes ids pour les nœuds gardés). Si la demande décrit un système entièrement différent, repars de zéro.\n\nGRAPHE EXISTANT :\n${JSON.stringify(slim)}\n`
}

// Transforme un plan IA (nœuds/fils bruts) en graphe Studio complet et mis en
// page. Extrait de buildGraphFromDescription pour être réutilisé par le mode
// conversationnel (on n'applique le graphe qu'après confirmation).
export function planToGraph(plan: ArchPlan, description: string): ArchitectResult {
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
      actionKey: an.kind === 'action'
        ? (['planning_save', 'calendar_race', 'notify_report'].includes(String(an.actionKey)) ? an.actionKey : 'planning_save')
        : undefined,
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

export async function buildGraphFromDescription(
  description: string,
  current?: StudioGraph,
  onProgress?: (t: string) => void,
  signal?: AbortSignal,
): Promise<ArchitectResult> {
  const pseudoNode: StudioNode = { id: 'arch', kind: 'agent', title: 'Architecte', x: 0, y: 0, model: 'athena' }
  const raw = await callAgent(pseudoNode, ARCHITECT_PROMPT + existingGraphBlock(current) + '\n' + description.trim(), onProgress ?? (() => {}), signal)
  return planToGraph(extractJson<ArchPlan>(raw), description)
}

// ══════════════════════════════════════════════════════════════
// ARCHITECTE CONVERSATIONNEL — clarifier puis confirmer avant d'appliquer.
// ──────────────────────────────────────────────────────────────
// Au lieu de construire directement, l'IA dialogue : elle pose des questions
// (choix cliquables façon coach) tant qu'il y a une ambiguïté, confirme sa
// compréhension, PUIS propose un plan que l'utilisateur doit valider
// explicitement. Aucune modification du graphe n'est appliquée sans ce « oui ».
// ══════════════════════════════════════════════════════════════

export type ArchitectTurn =
  | { action: 'ask'; message: string; question: string; options: string[] }
  | { action: 'propose'; message: string; plan: ArchPlan }
  | { action: 'reply'; message: string }

export interface ArchitectChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CONVERSE_PROMPT = `Tu es l'ARCHITECTE du Studio d'agents d'une app de coaching sportif hybride.
Tu dialogues avec l'utilisateur pour concevoir ou modifier un système multi-agents (un graphe), MAIS tu n'appliques JAMAIS de changement toi-même : l'app applique le graphe seulement après que l'utilisateur a cliqué « Confirmer ». Ton rôle : bien comprendre le besoin, lever toute ambiguïté, puis proposer un plan clair à valider.

BRIQUES DISPONIBLES (kind) :
- "trigger" : point d'entrée UNIQUE et OBLIGATOIRE. Son "role" = l'objectif du système.
- "source" : lit une page de l'app. "sourceKey" ∈ "activities" | "planning" | "injuries" | "recovery" | "profile". Pas de "role".
- "agent" : coach IA spécialisé. "role" = métier + mission, précis. "model" ∈ "hermes" | "athena" | "zeus".
- "merge" : fusionne les contributions en UNE réponse. "role" = consigne de synthèse.
- "validation" : pause + accord utilisateur avant de continuer. "role" = ce qu'on vérifie.
- "action" : écrit dans l'app. "actionKey" ∈ "planning_save" | "calendar_race" | "notify_report". Seulement si l'utilisateur veut vraiment écrire.

COMPORTEMENT (très important) :
- S'il y a la MOINDRE ambiguïté ou une info manquante qui changerait le système (objectif réel, sports concernés, écrire ou pas dans l'app, fréquence, niveau de détail, nombre d'étapes/agents…), pose UNE seule question à la fois, courte, avec 2 à 4 options cliquables. Une question à la fois, on avance pas à pas.
- Dis clairement ce que tu as compris ; si un point reste flou, signale-le explicitement au lieu de deviner.
- Ne propose un plan QUE lorsque tu as assez d'infos. Une demande triviale et sans ambiguïté peut aller directement à la proposition (l'utilisateur devra quand même confirmer).
- Le plan proposé doit résumer, en français simple, ce que le système fera et pourquoi ce découpage, puis lister implicitement les nœuds via le JSON.
- Reste bref et concret. Français.

RÈGLES DU GRAPHE (pour une proposition) : 3 à 7 nœuds, un seul "trigger", graphe connexe sans cycle, sources en entrée des agents concernés, termine par "merge" (ou "action" si écriture). Titres courts, rôles concrets.

RÉPONDS UNIQUEMENT avec un objet JSON, une de ces trois formes :
1) Question de clarification :
{"action":"ask","message":"une phrase : ce que tu as compris / pourquoi tu demandes","question":"ta question","options":["Option A","Option B","Option C"]}
2) Proposition à confirmer :
{"action":"propose","message":"résumé en français du système proposé et pourquoi","plan":{"name":"Nom court","explanation":"2-4 phrases","nodes":[{"id":"n1","kind":"trigger","title":"Objectif","role":"…"}],"edges":[{"from":"n1","to":"n2"}]}}
3) Réponse simple (question de l'utilisateur sans construction) :
{"action":"reply","message":"ta réponse"}
`

export async function converseArchitect(
  history: ArchitectChatMessage[],
  current?: StudioGraph,
  signal?: AbortSignal,
  model: StudioModel = 'athena',
): Promise<ArchitectTurn> {
  const pseudoNode: StudioNode = { id: 'arch', kind: 'agent', title: 'Architecte', x: 0, y: 0, model }
  const convo = history.map(m => `${m.role === 'user' ? 'UTILISATEUR' : 'ARCHITECTE'} : ${m.content}`).join('\n')
  const prompt = CONVERSE_PROMPT + existingGraphBlock(current) + '\n\nCONVERSATION :\n' + convo + '\n\nARCHITECTE :'
  const raw = await callAgent(pseudoNode, prompt, () => {}, signal)

  let parsed: { action?: string; message?: string; question?: string; options?: unknown; plan?: ArchPlan }
  try { parsed = extractJson(raw) } catch {
    // Pas de JSON exploitable → on traite la réponse brute comme un message.
    return { action: 'reply', message: raw.trim().slice(0, 1200) || "Je n'ai pas bien saisi — peux-tu reformuler ?" }
  }

  const message = String(parsed.message ?? '').slice(0, 1200)
  if (parsed.action === 'ask') {
    const options = Array.isArray(parsed.options)
      ? parsed.options.map(o => String(o).slice(0, 80)).filter(Boolean).slice(0, 4)
      : []
    return { action: 'ask', message, question: String(parsed.question ?? '').slice(0, 300), options }
  }
  if (parsed.action === 'propose' && parsed.plan && Array.isArray(parsed.plan.nodes)) {
    return { action: 'propose', message, plan: parsed.plan }
  }
  return { action: 'reply', message: message || raw.trim().slice(0, 1200) }
}
