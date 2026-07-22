// ══════════════════════════════════════════════════════════════
// Studio d'agents — modèle de graphe + persistance locale (MVP).
// ──────────────────────────────────────────────────────────────
// Un GRAPHE = des NŒUDS reliés par des FILS. La sortie d'un nœud alimente
// l'entrée des nœuds en aval. Types de nœuds :
//  • trigger    — point d'entrée, porte l'objectif.
//  • agent      — un coach IA avec un rôle précis.
//  • merge      — synthétise les contributions reçues.
//  • validation — met en pause et consulte l'utilisateur.
//  • source     — CONNECTEUR DE PAGE : lit les vraies données d'une page de
//                 l'app (Activités, Planning, Blessures, Récupération, Profil)
//                 et les injecte dans le graphe.
//  • action     — CONNECTEUR D'ÉCRITURE : agit sur l'app (ex. enregistrer des
//                 séances dans le Planning) — toujours après accord utilisateur.
//
// Persistance : localStorage pour le MVP (aucune migration Supabase). Le
// passage en base viendra avec l'autonomie planifiée, via migration explicite.
// ══════════════════════════════════════════════════════════════

export type StudioModel = 'hermes' | 'athena' | 'zeus'

export type StudioNodeKind = 'trigger' | 'agent' | 'merge' | 'validation' | 'source' | 'action'

// Pages de l'app branchables en LECTURE.
export type StudioSourceKey = 'activities' | 'planning' | 'injuries' | 'recovery' | 'profile'
// Actions d'ÉCRITURE disponibles.
export type StudioActionKey = 'planning_save'

export interface StudioNode {
  id: string
  kind: StudioNodeKind
  title: string
  x: number
  y: number
  role?: string            // trigger → objectif ; agent/merge → rôle ; validation → consigne
  model?: StudioModel      // agent / merge
  sourceKey?: StudioSourceKey  // source
  actionKey?: StudioActionKey  // action
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
  source:     'Page (lecture)',
  action:     'Action (écriture)',
}

export const SOURCE_LABEL: Record<StudioSourceKey, string> = {
  activities: 'Mes activités (30 j)',
  planning:   'Mon planning (14 j)',
  injuries:   'Mes blessures',
  recovery:   'Ma récupération (14 j)',
  profile:    'Mon profil',
}

export const ACTION_LABEL: Record<StudioActionKey, string> = {
  planning_save: 'Enregistrer dans le Planning',
}

// ── Graphe d'exemple : Objectif → (Endurance ∥ Force) → Synthèse ─────────
export function sampleGraph(): StudioGraph {
  const trigger = genId(), endur = genId(), force = genId(), synth = genId()
  return {
    id: genId(),
    name: 'Semaine hybride équilibrée',
    updatedAt: Date.now(),
    nodes: [
      { id: trigger, kind: 'trigger', title: 'Objectif', x: 250, y: 250,
        role: "Construire une semaine d'entraînement hybride équilibrée (endurance + force) pour un athlète intermédiaire, 5 séances." },
      { id: endur, kind: 'agent', title: 'Coach Endurance', x: 550, y: 120, model: 'athena',
        role: "Tu es un coach d'ENDURANCE. À partir de l'objectif, propose la partie endurance de la semaine (types de séances, volumes, zones). Sois concret." },
      { id: force, kind: 'agent', title: 'Coach Force', x: 550, y: 380, model: 'athena',
        role: "Tu es un coach de FORCE. À partir de l'objectif, propose la partie force/muscu de la semaine (séances, exercices clés, charges relatives). Sois concret." },
      { id: synth, kind: 'merge', title: 'Synthèse hebdo', x: 860, y: 250, model: 'zeus',
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

// ── Auto-layout par profondeur topologique ────────────────────────────────
// Place chaque nœud sur une colonne selon sa distance au déclencheur, et
// répartit verticalement les nœuds d'une même colonne. Utilisé quand l'IA
// construit le graphe (l'utilisateur peut ensuite tout déplacer à la main).
export function autoLayout(nodes: StudioNode[], edges: StudioEdge[]): StudioNode[] {
  const ids = new Set(nodes.map(n => n.id))
  const indeg = new Map<string, number>()
  nodes.forEach(n => indeg.set(n.id, 0))
  edges.forEach(e => { if (ids.has(e.from) && ids.has(e.to)) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1) })

  const depth = new Map<string, number>()
  let frontier = nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id)
  frontier.forEach(id => depth.set(id, 0))
  let guard = 0
  while (frontier.length && guard++ < 60) {
    const next: string[] = []
    for (const e of edges) {
      if (frontier.includes(e.from)) {
        const d = (depth.get(e.from) ?? 0) + 1
        if ((depth.get(e.to) ?? -1) < d) { depth.set(e.to, d); next.push(e.to) }
      }
    }
    frontier = next
  }

  const cols = new Map<number, StudioNode[]>()
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0
    if (!cols.has(d)) cols.set(d, [])
    cols.get(d)!.push(n)
  }
  const out: StudioNode[] = []
  for (const [d, list] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
    list.forEach((n, i) => {
      out.push({ ...n, x: 240 + d * 310, y: 150 + i * 195 + (d % 2 === 1 ? 40 : 0) })
    })
  }
  return out
}
