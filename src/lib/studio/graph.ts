// ══════════════════════════════════════════════════════════════
// Studio d'agents — modèle de graphe + persistance locale (MVP).
// ──────────────────────────────────────────────────────────────
// Un GRAPHE = des NŒUDS (agents/coachs avec un job) reliés par des FILS.
// La sortie d'un nœud alimente l'entrée des nœuds en aval. L'exécution
// (voir runner.ts) parcourt le graphe et fait travailler les agents ensemble.
//
// Persistance : localStorage pour le MVP (aucune migration Supabase). Le
// passage en base (graphes + historique des runs côté serveur) viendra avec
// l'autonomie planifiée, via une migration SQL explicite.
// ══════════════════════════════════════════════════════════════

export type StudioModel = 'hermes' | 'athena' | 'zeus'

// trigger    : point d'entrée, porte l'objectif/tâche initiale.
// agent      : fait un travail (rédige, analyse, critique…).
// merge      : synthétise les contributions reçues en une réponse.
// validation : met en pause et consulte l'utilisateur avant de continuer.
export type StudioNodeKind = 'trigger' | 'agent' | 'merge' | 'validation'

export interface StudioNode {
  id: string
  kind: StudioNodeKind
  title: string
  x: number
  y: number
  role?: string        // trigger → l'objectif ; agent/merge → le rôle (prompt) ; validation → la consigne
  model?: StudioModel  // agent / merge
}

export interface StudioEdge {
  id: string
  from: string
  to: string
}

export interface StudioGraph {
  id: string
  name: string
  nodes: StudioNode[]
  edges: StudioEdge[]
  updatedAt: number
}

export function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return 'x' + Math.abs(Date.now() ^ Math.floor(Math.random() * 1e9)).toString(36)
}

export const MODEL_LABEL: Record<StudioModel, string> = {
  hermes: 'Hermès',
  athena: 'Athéna',
  zeus:   'Zeus',
}

export const KIND_LABEL: Record<StudioNodeKind, string> = {
  trigger:    'Déclencheur',
  agent:      'Agent',
  merge:      'Synthèse',
  validation: 'Validation',
}

// ── Graphe d'exemple : Objectif → (Endurance ∥ Force) → Synthèse ─────────
// Montre d'emblée le concept : deux coachs travaillent en parallèle, un
// troisième fusionne. L'utilisateur n'a plus qu'à lancer.
export function sampleGraph(): StudioGraph {
  const trigger = genId(), endur = genId(), force = genId(), synth = genId()
  return {
    id: genId(),
    name: 'Semaine hybride équilibrée',
    updatedAt: Date.now(),
    nodes: [
      { id: trigger, kind: 'trigger', title: 'Objectif', x: 60,  y: 200,
        role: "Construire une semaine d'entraînement hybride équilibrée (endurance + force) pour un athlète intermédiaire, 5 séances." },
      { id: endur, kind: 'agent', title: 'Coach Endurance', x: 340, y: 90, model: 'athena',
        role: "Tu es un coach d'ENDURANCE. À partir de l'objectif, propose la partie endurance de la semaine (types de séances, volumes, zones). Sois concret." },
      { id: force, kind: 'agent', title: 'Coach Force', x: 340, y: 320, model: 'athena',
        role: "Tu es un coach de FORCE. À partir de l'objectif, propose la partie force/muscu de la semaine (séances, exercices clés, charges relatives). Sois concret." },
      { id: synth, kind: 'merge', title: 'Synthèse hebdo', x: 640, y: 200, model: 'zeus',
        role: "Fusionne les propositions endurance et force en UNE semaine cohérente et réaliste : répartis les séances sur 7 jours en évitant les conflits de fatigue, et justifie brièvement." },
    ],
    edges: [
      { id: genId(), from: trigger, to: endur },
      { id: genId(), from: trigger, to: force },
      { id: genId(), from: endur,   to: synth },
      { id: genId(), from: force,   to: synth },
    ],
  }
}

const KEY = 'thw_studio_graph_v1'

export function loadGraph(): StudioGraph {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const g = JSON.parse(raw) as StudioGraph
      if (g && Array.isArray(g.nodes) && Array.isArray(g.edges)) return g
    }
  } catch { /* ignore */ }
  return sampleGraph()
}

export function saveGraph(g: StudioGraph): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...g, updatedAt: Date.now() })) } catch { /* ignore */ }
}

export function resetGraph(): StudioGraph {
  const g = sampleGraph()
  saveGraph(g)
  return g
}
