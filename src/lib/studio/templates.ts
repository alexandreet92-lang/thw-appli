// ══════════════════════════════════════════════════════════════
// Studio — TEMPLATES prêts à l'emploi.
// Chaque template retourne un graphe complet (ids frais à chaque
// appel) : l'utilisateur le personnalise ensuite sur la toile.
// ══════════════════════════════════════════════════════════════

import { genId, autoLayout, type StudioGraph, type StudioNode, type StudioEdge } from './graph'

export interface StudioTemplate {
  key: string
  name: string
  description: string
  build: () => StudioGraph
}

function graphOf(name: string, nodes: StudioNode[], links: [string, string][]): StudioGraph {
  const edges: StudioEdge[] = links.map(([from, to]) => ({ id: genId(), from, to }))
  return { id: genId(), name, nodes: autoLayout(nodes, edges), edges, updatedAt: Date.now() }
}

function bilanHebdo(): StudioGraph {
  const trig = genId(), act = genId(), rec = genId(), ana = genId(), synth = genId()
  return graphOf('Bilan hebdo', [
    { id: trig, kind: 'trigger', title: 'Objectif', x: 0, y: 0,
      role: "Faire le bilan de ma semaine d'entraînement : charge, équilibre endurance/force, récupération, signaux de risque, et 3 recommandations concrètes pour la semaine suivante." },
    { id: act, kind: 'source', title: 'Activités', x: 0, y: 0, sourceKey: 'activities' },
    { id: rec, kind: 'source', title: 'Récupération', x: 0, y: 0, sourceKey: 'recovery' },
    { id: ana, kind: 'agent', title: 'Analyste charge', x: 0, y: 0, model: 'athena',
      role: "Tu es un analyste de la charge d'entraînement. À partir des activités et des données de récupération reçues, quantifie la semaine (volume, intensité, répartition par sport), repère les déséquilibres et les signaux de fatigue. Chiffres à l'appui." },
    { id: synth, kind: 'merge', title: 'Rapport hebdo', x: 0, y: 0, model: 'athena',
      role: 'Rédige LE bilan hebdo : synthèse claire, points forts, points de vigilance, et 3 recommandations concrètes et actionnables pour la semaine suivante.' },
  ], [[trig, ana], [act, ana], [rec, ana], [ana, synth]])
}

function semaineHybride(): StudioGraph {
  const trig = genId(), endur = genId(), force = genId(), synth = genId()
  return graphOf('Semaine hybride équilibrée', [
    { id: trig, kind: 'trigger', title: 'Objectif', x: 0, y: 0,
      role: "Construire une semaine d'entraînement hybride équilibrée (endurance + force) pour un athlète intermédiaire, 5 séances." },
    { id: endur, kind: 'agent', title: 'Coach Endurance', x: 0, y: 0, model: 'athena',
      role: "Tu es un coach d'ENDURANCE. À partir de l'objectif, propose la partie endurance de la semaine (types de séances, volumes, zones). Sois concret." },
    { id: force, kind: 'agent', title: 'Coach Force', x: 0, y: 0, model: 'athena',
      role: "Tu es un coach de FORCE. À partir de l'objectif, propose la partie force/muscu de la semaine (séances, exercices clés, charges relatives). Sois concret." },
    { id: synth, kind: 'merge', title: 'Synthèse hebdo', x: 0, y: 0, model: 'zeus',
      role: 'Fusionne les propositions endurance et force en UNE semaine cohérente et réaliste : répartis les séances sur 7 jours en évitant les conflits de fatigue, et justifie brièvement.' },
  ], [[trig, endur], [trig, force], [endur, synth], [force, synth]])
}

function prepaCourse(): StudioGraph {
  const trig = genId(), prof = genId(), act = genId(), plan = genId(), strat = genId(), synth = genId()
  return graphOf('Préparation course', [
    { id: trig, kind: 'trigger', title: 'Objectif', x: 0, y: 0,
      role: "Préparer ma prochaine course : construire les grandes lignes du bloc d'entraînement restant ET une stratégie de course réaliste, à partir de mon profil et de mon historique." },
    { id: prof, kind: 'source', title: 'Profil', x: 0, y: 0, sourceKey: 'profile' },
    { id: act, kind: 'source', title: 'Activités', x: 0, y: 0, sourceKey: 'activities' },
    { id: plan, kind: 'agent', title: 'Coach Prépa', x: 0, y: 0, model: 'athena',
      role: "Tu es un coach de préparation. À partir du profil et de l'historique reçus, propose la structure du bloc d'ici la course : progression de charge, séances clés, affûtage." },
    { id: strat, kind: 'agent', title: 'Stratège course', x: 0, y: 0, model: 'athena',
      role: "Tu es un stratège de course. À partir du profil et de l'historique reçus, propose une stratégie de course réaliste : allures/puissances cibles, gestion de l'effort, nutrition pendant l'épreuve." },
    { id: synth, kind: 'merge', title: 'Plan de prépa', x: 0, y: 0, model: 'zeus',
      role: 'Assemble un plan de préparation unique et cohérent : le bloc d’entraînement ET la stratégie de course, sans contradiction entre les deux.' },
  ], [[trig, plan], [trig, strat], [prof, plan], [prof, strat], [act, plan], [act, strat], [plan, synth], [strat, synth]])
}

function retourBlessure(): StudioGraph {
  const trig = genId(), inj = genId(), rec = genId(), prud = genId(), reprise = genId(), synth = genId()
  return graphOf('Retour de blessure', [
    { id: trig, kind: 'trigger', title: 'Objectif', x: 0, y: 0,
      role: 'Construire un protocole de reprise progressive après blessure : sécurisé, par paliers, avec des critères objectifs de passage au palier suivant.' },
    { id: inj, kind: 'source', title: 'Blessures', x: 0, y: 0, sourceKey: 'injuries' },
    { id: rec, kind: 'source', title: 'Récupération', x: 0, y: 0, sourceKey: 'recovery' },
    { id: prud, kind: 'agent', title: 'Garde-fou médical', x: 0, y: 0, model: 'athena',
      role: "Tu es le garde-fou prudence. À partir des blessures et de l'état de récupération reçus, liste les contre-indications, les mouvements à éviter et les signaux d'alerte qui doivent faire stopper la reprise. Tu n'es PAS médecin : recommande une consultation quand c'est pertinent." },
    { id: reprise, kind: 'agent', title: 'Coach reprise', x: 0, y: 0, model: 'athena',
      role: 'Tu es un coach de réathlétisation. Propose une reprise par paliers (volume, intensité, exercices) avec des critères objectifs de progression entre paliers.' },
    { id: synth, kind: 'merge', title: 'Protocole de reprise', x: 0, y: 0, model: 'zeus',
      role: 'Fusionne le plan de reprise et les garde-fous en UN protocole clair par paliers : quoi faire, quand progresser, quand s’arrêter.' },
  ], [[trig, prud], [trig, reprise], [inj, prud], [inj, reprise], [rec, prud], [prud, synth], [reprise, synth]])
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  { key: 'bilan_hebdo', name: 'Bilan hebdo', description: 'Analyse ta semaine (charge, équilibre, récupération) et sort 3 recommandations.', build: bilanHebdo },
  { key: 'semaine_hybride', name: 'Semaine hybride', description: 'Deux coachs (endurance + force) construisent ta semaine, une synthèse arbitre.', build: semaineHybride },
  { key: 'prepa_course', name: 'Préparation course', description: 'Bloc d’entraînement + stratégie de course à partir de ton profil et ton historique.', build: prepaCourse },
  { key: 'retour_blessure', name: 'Retour de blessure', description: 'Protocole de reprise par paliers avec garde-fous et critères objectifs.', build: retourBlessure },
]
