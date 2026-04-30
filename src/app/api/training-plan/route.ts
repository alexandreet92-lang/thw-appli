export const maxDuration = 60

import { NextRequest } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

export const runtime = 'nodejs'

// ── Types ─────────────────────────────────────────────────────

interface TrainingPlanRequestBody {
  questionnaire: Record<string, unknown>
  profil?: Record<string, unknown> | null
  zones?: Record<string, unknown> | null
  historique_90j?: Record<string, unknown>[] | null
  calendrier_objectifs?: Record<string, unknown>[] | null
  sante?: Record<string, unknown>[] | null
  modification?: string
  programme_actuel?: Record<string, unknown> | null
}

interface PlanBloc {
  nom: string
  duree_min: number
  zone: number
  repetitions: number
  recup_min: number
  watts: number | null
  allure: string | null
  consigne: string
}

interface PlanSeance {
  jour: number
  sport: string
  titre: string
  duree_min: number
  tss: number
  intensite: 'low' | 'moderate' | 'high' | 'max'
  heure: string
  notes: string
  rpe: number
  blocs: PlanBloc[]
}

interface PlanSemaine {
  numero: number
  type: string
  volume_h: number
  tss_semaine: number
  theme: string
  note_coach?: string
  // Toutes les semaines ont des séances ; les blocs sont détaillés S1-S2 uniquement
  seances?: PlanSeance[]
}

interface PlanPeriodisation {
  nom: string
  type: 'Base' | 'Intensité' | 'Spécifique' | 'Deload' | 'Compétition'
  semaine_debut: number
  semaine_fin: number
  description: string
  volume_hebdo_h: number
}

interface GeneratedPlan {
  nom: string
  duree_semaines: number
  objectif_principal: string
  blocs_periodisation: PlanPeriodisation[]
  semaines: PlanSemaine[]
  conseils_adaptation: string[]
  points_cles: string[]
}

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `Tu es un coach expert en planification d'entraînement sportif de haut niveau.
Tu crées des programmes structurés, périodisés et personnalisés.
Tu réponds UNIQUEMENT avec un objet JSON valide selon le schéma fourni.
Aucun texte avant ni après, aucun commentaire, aucun bloc markdown.`

// ── JSON schema ────────────────────────────────────────────────

const JSON_SCHEMA = `{
  "nom": "string — nom du programme",
  "duree_semaines": "number",
  "objectif_principal": "string",
  "blocs_periodisation": [
    {
      "nom": "string",
      "type": "Base | Intensité | Spécifique | Deload | Compétition",
      "semaine_debut": "number",
      "semaine_fin": "number",
      "description": "string (1 phrase)",
      "volume_hebdo_h": "number"
    }
  ],
  "semaines": [
    {
      "numero": "number",
      "type": "string",
      "volume_h": "number",
      "tss_semaine": "number",
      "theme": "string (1 phrase courte)",
      "note_coach": "string (1 phrase de coaching)",
      "seances": [
          {
            "jour": "number (0=lundi, 6=dimanche)",
            "sport": "string",
            "titre": "string",
            "duree_min": "number",
            "tss": "number",
            "intensite": "low | moderate | high | max",
            "heure": "string (ex: 06:30)",
            "notes": "string (1 phrase, ≤12 mots)",
            "rpe": "number",
            "blocs": [
              {
                "nom": "string",
                "duree_min": "number",
                "zone": "number (1-5)",
                "repetitions": "number",
                "recup_min": "number",
                "watts": "number | null",
                "allure": "string | null",
                "consigne": "string (1 phrase, ≤10 mots)"
              }
            ]
          }
      ]
    }
  ],
  "conseils_adaptation": ["string (3 max)"],
  "points_cles": ["string (3 max)"]
}`

// ── repairJSON ────────────────────────────────────────────────
// Tente de réparer un JSON tronqué en trouvant le dernier
// objet complet et en fermant proprement les crochets manquants.

function repairJSON(raw: string): string {
  // Nettoyer markdown et trouver le début JSON
  let text = raw.trim()
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) text = mdMatch[1].trim()
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)

  // Tenter le parse direct
  try { JSON.parse(text); return text } catch { /* repair needed */ }

  // Scanner pour trouver le dernier endroit "propre" à couper
  // et la séquence de fermeture manquante
  const stack: string[] = []
  let inStr = false
  let esc = false
  let lastSafeClose = -1

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (esc)                  { esc = false; continue }
    if (c === '\\' && inStr)  { esc = true;  continue }
    if (c === '"')            { inStr = !inStr; continue }
    if (inStr)                continue

    if (c === '{' || c === '[') {
      stack.push(c === '{' ? '}' : ']')
    } else if (c === '}' || c === ']') {
      stack.pop()
      // Enregistrer les positions où on ferme un élément imbriqué
      // (pas à la racine = stack non vide après le pop)
      if (stack.length >= 1) lastSafeClose = i
    }
  }

  // Si le JSON est déjà équilibré mais invalide → rien à faire
  if (stack.length === 0) return text

  // Tronquer au dernier endroit propre
  let repaired = lastSafeClose >= 0
    ? text.slice(0, lastSafeClose + 1)
    : text

  // Supprimer une éventuelle virgule finale orpheline
  repaired = repaired.replace(/,\s*$/, '')

  // Ajouter les fermetures manquantes dans l'ordre inverse
  repaired += stack.reverse().join('')

  // Vérifier que le résultat est valide
  try { JSON.parse(repaired); return repaired } catch { return text }
}

// ─────────────────────────────────────────────────────────────

function parseAndRepair<T>(raw: string): T {
  console.log('[training-plan] raw response length:', raw.length)
  console.log('[training-plan] raw response tail (200 chars):', raw.slice(-200))

  let text = raw.trim()

  // Strip markdown code block
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) text = mdMatch[1].trim()

  // Find first { or [
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)

  // First attempt: direct parse
  try {
    return JSON.parse(text) as T
  } catch (e) {
    console.log('[training-plan] Direct parse failed:', e instanceof Error ? e.message : String(e))
  }

  // Second attempt: repair truncated JSON
  const repaired = repairJSON(raw)
  console.log('[training-plan] Attempting repaired JSON parse, length:', repaired.length)
  return JSON.parse(repaired) as T
}

// ─────────────────────────────────────────────────────────────
// normalizePlan — accepte les variations de clés renvoyées par l'agent
// (programme/program, semaines/weeks, blocs/blocks/blocs_periodisation)
// et ramène vers la forme GeneratedPlan attendue par le front.
// ─────────────────────────────────────────────────────────────

function normalizePlan(raw: unknown): GeneratedPlan {
  const r = (raw ?? {}) as Record<string, unknown>

  // Unwrap si l'agent double-wrap : { programme: {...} } ou { program: {...} }
  const inner = (r.programme && typeof r.programme === 'object') ? r.programme as Record<string, unknown>
              : (r.program   && typeof r.program   === 'object') ? r.program   as Record<string, unknown>
              : r

  // Aliases top-level
  const semainesRaw = (inner.semaines ?? inner.weeks) as unknown[] | undefined
  const blocsRaw    = (inner.blocs_periodisation ?? inner.blocs ?? inner.blocks) as unknown[] | undefined

  // Normaliser chaque semaine : seances/sessions, et chaque seance : blocs/blocks
  const semaines = Array.isArray(semainesRaw) ? semainesRaw.map(w => {
    const wr = (w ?? {}) as Record<string, unknown>
    const seancesRaw = (wr.seances ?? wr.sessions) as unknown[] | undefined
    const seances = Array.isArray(seancesRaw) ? seancesRaw.map(s => {
      const sr = (s ?? {}) as Record<string, unknown>
      const blocsSeance = (sr.blocs ?? sr.blocks) as unknown[] | undefined
      return { ...sr, blocs: Array.isArray(blocsSeance) ? blocsSeance : [] }
    }) : undefined
    return seances ? { ...wr, seances } : { ...wr }
  }) : []

  return {
    ...(inner as unknown as GeneratedPlan),
    // Alias: AI may return `name` instead of the schema-mandated `nom`
    nom: (inner.nom ?? inner.name ?? 'Plan d\'entraînement') as string,
    // Alias: AI may return `objectif` instead of `objectif_principal`
    objectif_principal: (inner.objectif_principal ?? inner.objectif ?? '') as string,
    semaines: semaines as GeneratedPlan['semaines'],
    blocs_periodisation: (Array.isArray(blocsRaw) ? blocsRaw : []) as GeneratedPlan['blocs_periodisation'],
    conseils_adaptation: Array.isArray(inner.conseils_adaptation) ? inner.conseils_adaptation as string[] : [],
    points_cles: Array.isArray(inner.points_cles) ? inner.points_cles as string[] : [],
  }
}

// ─────────────────────────────────────────────────────────────
// formatQuestionnaireForPrompt
// Transforme le form brut en texte structuré lisible par le coach IA.
// Chaque section est explicitée — l'IA n'a pas à deviner les noms de clés.
// ─────────────────────────────────────────────────────────────

function formatQuestionnaireForPrompt(q: Record<string, unknown>): string {
  const s   = (k: string, fb = '') => String(q[k] ?? fb)
  const n   = (k: string, fb = 0) => Number(q[k] ?? fb)
  const b   = (k: string) => q[k] === true
  const arr = (k: string): string[] => Array.isArray(q[k]) ? (q[k] as string[]) : []
  const rec = (k: string): Record<string, unknown> =>
    (q[k] && typeof q[k] === 'object' && !Array.isArray(q[k]))
      ? (q[k] as Record<string, unknown>) : {}

  // ── 1. Objectif ──────────────────────────────────────────────
  const sport = s('sport_principal')
  const hybride = (Array.isArray(q.sports_hybride) ? q.sports_hybride as Record<string,unknown>[] : [])
    .map(h => `${h.sport} (${h.importance})`).join(', ')

  const goalRaces = (Array.isArray(q.goal_races) ? q.goal_races as Record<string,unknown>[] : [])
  const racesText = goalRaces.length ? goalRaces.map((r, i) => {
    const rs = r as Record<string, unknown>
    let line = `  [${String(rs.level ?? 'course').toUpperCase()}] ${rs.nom ?? '?'} — ${rs.date ?? '?'} | Sport: ${rs.sport ?? '?'}`
    if (rs.goal_libre)      line += `\n    Objectif: ${rs.goal_libre}`
    if (rs.run_distance)    line += `\n    Distance running: ${rs.run_distance}`
    if (rs.trail_elevation) line += `\n    Dénivelé trail: ${rs.trail_elevation}`
    if (rs.tri_distance)    line += `\n    Format triathlon: ${rs.tri_distance}`
    const hasTri = rs.tri_goal_swim || rs.tri_goal_t1 || rs.tri_goal_bike || rs.tri_goal_t2 || rs.tri_goal_run
    if (hasTri) line += `\n    Temps cibles tri: Nage ${rs.tri_goal_swim ?? '—'} | T1 ${rs.tri_goal_t1 ?? '—'} | Vélo ${rs.tri_goal_bike ?? '—'} | T2 ${rs.tri_goal_t2 ?? '—'} | Run ${rs.tri_goal_run ?? '—'}`
    if (rs.hyrox_format)    line += `\n    Format Hyrox: ${rs.hyrox_format}${rs.hyrox_gender ? ` (${rs.hyrox_gender})` : ''}`
    if (rs.velo_type)       line += `\n    Type vélo: ${rs.velo_type}${rs.velo_distance ? `, ${rs.velo_distance}` : ''}${rs.velo_elevation ? `, D+ ${rs.velo_elevation}` : ''}`
    if (rs.aviron_format)   line += `\n    Format aviron: ${rs.aviron_format}`
    if (rs.natation_type)   line += `\n    Natation: ${rs.natation_type}${rs.natation_distance ? ` ${rs.natation_distance}` : ''}`
    if (rs.goal_time)       line += `\n    Temps cible: ${rs.goal_time}`
    return `  Course ${i+1}:\n${line}`
  }).join('\n') : '  Aucune course renseignée'

  // ── 2. Profil ─────────────────────────────────────────────────
  const meilleurePerf = s('meilleure_performance')

  // ── 3. Disponibilité ──────────────────────────────────────────
  const isTri   = sport.toLowerCase() === 'triathlon' || goalRaces.some(r => String(r.sport ?? '').toLowerCase() === 'triathlon' && (r.level === 'gty' || r.level === 'main'))
  const isHyrox = sport.toLowerCase() === 'hyrox'    || goalRaces.some(r => String(r.sport ?? '').toLowerCase() === 'hyrox'    && (r.level === 'gty' || r.level === 'main'))
  const triRep  = rec('repartition_tri')
  const hyroxRep = rec('repartition_hyrox')
  let repartitionText = ''
  if (isTri)   repartitionText = `  Répartition Triathlon/semaine: Natation ${triRep.natation ?? 0}j | Vélo ${triRep.velo ?? 0}j | Run ${triRep.run ?? 0}j | Muscu ${triRep.muscu ?? 0}j`
  if (isHyrox) repartitionText = `  Répartition Hyrox/semaine: Run ${hyroxRep.run ?? 0}j | Muscu ${hyroxRep.muscu ?? 0}j | Spé Hyrox ${hyroxRep.spe ?? 0}j | Vélo ${hyroxRep.velo ?? 0}j`

  // ── 4. Blessures ──────────────────────────────────────────────
  const blessures: string[] = []
  if (b('blessures_passees')) {
    const zones = arr('blessures_zones').join(', ') || '?'
    blessures.push(`Blessure passée — Zone(s): ${zones}${s('blessures_date') ? `, date: ${s('blessures_date')}` : ''} — ${s('blessures_detail') || 'non précisé'}`)
  }
  if (b('gene_recente')) {
    const zones = arr('gene_zones').join(', ') || '?'
    blessures.push(`Gêne récente — Zone(s): ${zones} — ${s('gene_detail') || 'non précisé'}`)
  }
  if (b('contraintes_permanentes')) {
    const zones = arr('contraintes_zones').join(', ') || '?'
    blessures.push(`Contrainte permanente — Zone(s): ${zones} — ${s('contraintes_detail') || 'non précisé'}`)
  }
  if (b('antecedents')) blessures.push(`Antécédents médicaux: ${s('antecedents_detail') || 'non précisé'}`)

  // ── 5. Blocs custom ───────────────────────────────────────────
  const blocsCustom = (Array.isArray(q.blocs_custom_detail) ? q.blocs_custom_detail as Record<string,unknown>[] : [])
  const blocsCustomText = b('blocs_custom') && blocsCustom.length
    ? blocsCustom.map(bc => `  Bloc "${bc.nom}" — type: ${bc.type} — ${bc.duree_semaines} sem.${bc.discipline ? ` — discipline: ${bc.discipline}` : ''}`).join('\n')
    : '  Laissé à l\'IA'

  // ── 6. Entraînements spéciaux ─────────────────────────────────
  const spTrainings: string[] = []
  if (b('heat_training'))    spTrainings.push(`Heat training: ${s('heat_training_freq') || '?'}x/sem`)
  if (b('altitude_training')) spTrainings.push(`Altitude training: ${s('altitude_training_semaines') || '?'} sem`)
  if (b('jeune_entraine'))   spTrainings.push(`Entraînement à jeun: ${s('jeune_entraine_freq') || '?'}x/sem`)
  if (b('double_entrainement')) {
    const jours = arr('double_entrainement_jours')
    spTrainings.push(`Double séance${jours.length ? ' — jours: ' + jours.join(', ') : ''}`)
  }
  if (b('nocturne'))         spTrainings.push('Entraînement nocturne')
  if (b('brick_training'))   spTrainings.push(`Brick training: ${s('brick_training_freq') || '?'}`)
  if (b('natation_eau_libre')) spTrainings.push('Natation en eau libre')

  // ── 7. Type de journée ────────────────────────────────────────
  const joursType = rec('journees_type')
  const joursTypeText = b('journees_type_actif') && Object.keys(joursType).length
    ? Object.entries(joursType).filter(([,v]) => v).map(([j, v]) => `${j}: ${v}`).join(' | ')
    : 'Non défini'

  // ── 8. Connaissance de soi ────────────────────────────────────
  const ptsF = arr('points_forts').join(', ')
  const ptsFb = arr('points_faibles').join(', ')
  const diff = arr('difficultes').join(', ')
  const efAim = arr('efforts_aimes').join(', ')
  const efDet = arr('efforts_detestes').join(', ')

  // ── 9. Habitudes d'entraînement ───────────────────────────────
  const habitudes: string[] = []
  if (b('easy_lundi'))            habitudes.push('Easy lundi')
  if (arr('habitude_double_jours').length) habitudes.push(`Double: ${arr('habitude_double_jours').join(', ')}`)
  if (arr('repos_fixe_jours').length)      habitudes.push(`Repos fixe: ${arr('repos_fixe_jours').join(', ')}`)
  if (s('seance_longue_jour'))    habitudes.push(`Séance longue: ${s('seance_longue_jour')}`)
  if (s('seance_cle_jour'))       habitudes.push(`Séance clé: ${s('seance_cle_jour')}`)
  if (b('entrainement_a_jeun'))   habitudes.push(`À jeun: ${s('entrainement_a_jeun_freq') || '?'}x/sem`)

  // ── 10. Suivi et récupération ─────────────────────────────────
  const suivi: string[] = []
  if (b('hrv_mesure'))            suivi.push(`HRV: ${s('hrv_outil') || 'outil non précisé'}`)
  if (b('suivi_sommeil'))         suivi.push(`Sommeil: ${s('suivi_sommeil_outil') || 'outil non précisé'}`)
  if (b('alcool_regulier'))       suivi.push('Consommation alcool régulière')
  if (b('cafeine_regulier'))      suivi.push(`Caféine: ${s('cafeine_timing') === 'journee' ? 'toute la journée' : 'matin uniquement'}`)

  // ── Formatage final ───────────────────────────────────────────
  return `
━━━ 1. OBJECTIF PRINCIPAL ━━━
Sport principal: ${sport || 'non précisé'}${hybride ? `\nSports hybrides: ${hybride}` : ''}
Expérience: ${s('experience') || 'non précisée'}
Niveau de connaissance: ${s('niveau_connaissance') || 'non précisé'}

Courses cibles (Goal of the Year + secondaires):
${racesText}

━━━ 2. PROFIL PERFORMANCE ━━━
Expérience: ${s('experience') || '?'} | Volume actuel: ${n('volume_actuel')}h/sem | Forme actuelle: ${s('forme_actuelle') || '?'}
Meilleure performance: ${meilleurePerf || 'non renseignée'}
Programme précédent: ${b('programme_precedent') ? `Oui — ${s('programme_precedent_detail')}` : 'Non'}
${s('precision_profil') ? `Précisions profil: ${s('precision_profil')}` : ''}

Points forts: ${ptsF || 'non précisés'}
Points faibles: ${ptsFb || 'non précisés'}
${s('points_forts_detail') ? `Détail: ${s('points_forts_detail')}` : ''}
Difficultés habituelles: ${diff || 'non précisées'}
${s('difficultes_detail') ? `Détail: ${s('difficultes_detail')}` : ''}
Efforts aimés: ${efAim || 'non précisés'}
Efforts détestés: ${efDet || 'non précisés'}

━━━ 3. DISPONIBILITÉ ━━━
Séances/semaine: début de prépa ${n('seances_debut_prepa')}, pic de prépa ${n('seances_pic_prepa')}
${repartitionText}
Musculation incluse: ${b('include_muscu') ? `Oui, ${n('seances_muscu')} séance(s)/sem` : 'Non'}
Heures/semaine: ${n('heures_par_semaine')}h
Jours de repos: ${arr('jours_repos').join(', ') || 'aucun spécifié'}
Contraintes horaires: ${s('contraintes_horaires') || 'flexible'}
${s('precision_dispo') ? `Précisions disponibilité: ${s('precision_dispo')}` : ''}

Type de journée par jour (si défini):
${joursTypeText}

━━━ 4. ÉQUIPEMENT ━━━
${arr('equipements').join(', ') || 'non précisé'}
${s('precision_equipement') ? `Précisions: ${s('precision_equipement')}` : ''}

━━━ 5. BLESSURES & CONTRAINTES MÉDICALES ━━━
${blessures.length ? blessures.map(l => `- ${l}`).join('\n') : 'Aucune blessure ni contrainte signalée'}
${s('precision_sante') ? `Précisions santé: ${s('precision_sante')}` : ''}

━━━ 6. MÉTHODES & PÉRIODISATION ━━━
Blocs de périodisation:
${blocsCustomText}
Entrée dans le programme: ${s('entree_programme') === 'prudent' ? 'Progressif' : s('entree_programme') === 'intense' ? 'Direct — prêt à charger' : 'non précisé'}
Réaction au volume: ${s('reaction_volume') || 'non précisée'}
Réaction à l'intensité: ${s('reaction_intensite') || 'non précisée'}
${s('precision_methode') ? `Précisions méthode: ${s('precision_methode')}` : ''}

Entraînements spéciaux demandés:
${spTrainings.length ? spTrainings.map(t => `- ${t}`).join('\n') : '- Aucun'}

━━━ 7. RÉCUPÉRATION & MODE DE VIE ━━━
Sommeil: ${n('sommeil_heures')}h/nuit
Fatigue travail: ${s('fatigue_travail') || 'non précisée'}
Périodes de stress: ${s('stress_annee') || 'non précisée'}${s('stress_detail') ? ` — ${s('stress_detail')}` : ''}
Outils récupération: ${arr('outils_recuperation').join(', ') || 'aucun'}
${s('precision_recup') ? `Précisions récup: ${s('precision_recup')}` : ''}

Habitudes d'entraînement:
${habitudes.length ? habitudes.map(h => `- ${h}`).join('\n') : '- Non précisées'}

Suivi & biométrie:
${suivi.length ? suivi.map(s => `- ${s}`).join('\n') : '- Non précisé'}

━━━ 8. NUTRITION ━━━
Plan nutritionnel: ${s('plan_nutritionnel') || 'non précisé'}
Contraintes alimentaires: ${arr('contraintes_alimentaires').join(', ') || 'aucune'}
Compléments: ${arr('complements').join(', ') || 'aucun'}
Alimentation avant entraînement: ${s('timing_nutrition') === 'toujours' ? 'Oui toujours' : s('timing_nutrition') === 'selon_heure' ? 'Selon l\'heure' : s('timing_nutrition') === 'jeun' ? 'À jeun' : 'non précisé'}
Ravitaillement sorties longues: ${s('ravitaillement') === 'oui' ? 'Oui régulièrement' : s('ravitaillement') === 'parfois' ? 'Parfois' : s('ravitaillement') === 'non' ? 'Non' : 'non précisé'}
Objectif corporel: ${s('objectif_poids') === 'perdre' ? 'Perte de poids' : s('objectif_poids') === 'maintenir' ? 'Maintien' : s('objectif_poids') === 'prendre' ? 'Prise de poids' : s('objectif_poids') === 'non_concerne' ? 'Non concerné' : 'non précisé'}
${s('precision_nutrition') ? `Précisions nutrition: ${s('precision_nutrition')}` : ''}`.trim()
}

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  let body: TrainingPlanRequestBody
  try {
    body = await req.json() as TrainingPlanRequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const {
    questionnaire,
    profil,
    zones,
    historique_90j,
    calendrier_objectifs,
    sante,
    modification,
    programme_actuel,
  } = body

  const formattedQuestionnaire = formatQuestionnaireForPrompt(questionnaire)

  // Tronquer l'historique à 30 activités max pour réduire la taille du prompt
  const historique_30j = (historique_90j ?? []).slice(0, 30)

  const userPrompt = `Crée un programme d'entraînement avec ces informations :

QUESTIONNAIRE ATHLÈTE — INTERPRÉTATION STRUCTURÉE :
${formattedQuestionnaire}

PROFIL PERFORMANCE (zones, FTP, VO2max) :
${JSON.stringify(profil ?? null, null, 2)}

ZONES D'ENTRAÎNEMENT :
${JSON.stringify(zones ?? null, null, 2)}

HISTORIQUE 30 DERNIERS JOURS :
${JSON.stringify(historique_30j, null, 2)}

CALENDRIER ET OBJECTIFS :
${JSON.stringify(calendrier_objectifs ?? [], null, 2)}

DONNÉES SANTÉ RÉCENTES :
${JSON.stringify(sante ?? [], null, 2)}

${modification ? `MODIFICATION DEMANDÉE :\n${modification}\n\nPROGRAMME EXISTANT :\n${JSON.stringify(programme_actuel ?? null, null, 2)}` : ''}

INSTRUCTIONS DE GÉNÉRATION — RESPECTER IMPÉRATIVEMENT :

STRUCTURE :
- Génère le détail complet des séances (seances[]) pour TOUTES les semaines du plan, sans exception.
- Pour chaque séance : sport, titre, jour (0=lundi…6=dimanche), duree_min, tss, intensite, heure, notes, rpe.
- Blocs détaillés (blocs[]) : UNIQUEMENT semaines 1 et 2. Semaines 3+ → blocs: [].
- note_coach : OBLIGATOIRE pour chaque semaine, 1 phrase de coaching contextuelle.
- conseils_adaptation : 3 éléments maximum. points_cles : 3 éléments maximum.
- Chaque "consigne" ≤ 10 mots, chaque "notes" ≤ 12 mots.

COURSES & OBJECTIFS :
- Construire la périodisation en remontant depuis la date de la course GTY (ou Principale si pas de GTY).
- Respecter les temps cibles par discipline (triathlon : nage/T1/vélo/T2/run ; autre sport : temps global).
- Intégrer les courses secondaires comme jalons intermédiaires, sans les sur-charger.

DISPONIBILITÉ & RÉPARTITION :
- Respecter strictement le nombre de séances (début de prépa / pic de prépa).
- Pour Triathlon ou Hyrox : distribuer les séances selon la répartition par discipline fournie.
- Respecter les jours de repos fixes et les contraintes horaires.
- Placer la séance longue et la séance clé (intensité) aux jours préférés indiqués.
- Si type de journée défini par jour : respecter cet encodage (Hard ≤ 3/sem, Récup = pas de charge).

BLESSURES & ZONES FRAGILES :
- Adapter les exercices et l'intensité selon les zones corporelles blessées ou fragiles.
- Réduire ou exclure les contraintes mécaniques sur la zone concernée.
- Pour contraintes permanentes : appliquer la restriction sur TOUTE la durée du plan.

BLOCS DE PÉRIODISATION :
- Si blocs custom définis : suivre exactement l'ordre, le type et la durée indiqués.
- Intégrer la discipline associée à chaque bloc si précisée.
- Inclure les entraînements spéciaux demandés (heat, altitude, double séance, nocturne, brick, etc.).

CONNAISSANCE DE SOI & PSYCHOLOGIE :
- Appuyer le programme sur les points forts, limiter l'exposition aux points faibles.
- Adapter la structure aux difficultés habituelles signalées (saturation volume, récupération, etc.).
- Favoriser les types d'efforts aimés dans les séances plaisir/récupération.

NUTRITION & RÉCUPÉRATION :
- Si objectif poids = perte : suggérer des séances longues à faible intensité, limiter les entraînements intenses à jeun.
- Si ravitaillement à l'entraînement = Oui : intégrer des sorties longues avec pratique ravitaillement.
- Tenir compte du sommeil, de la fatigue au travail et des périodes de stress pour moduler la charge.

Génère selon ce schéma JSON (UNIQUEMENT le JSON, rien d'autre) :
${JSON_SCHEMA}

RÈGLES GÉNÉRALES — RESPECTER ABSOLUMENT :
0. FORMAT ULTRA-COMPACT : 4 semaines MAXIMUM. blocs:[] pour TOUTES les semaines. Titres ≤ 3 mots. Notes ≤ 5 mots. Maximum 2000 tokens total.
1. Programme réaliste adapté au niveau et au temps disponible
2. Progression logique (Base → Intensité → Spécifique → Compétition)
3. TSS cohérent avec la durée et l'intensité
4. Respect des jours de repos demandés`

  try {
    const client = getAnthropicClient()
    const resp = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Tâche 2 — vérification stop_reason avant tout parsing
    console.log('[training-plan] stop_reason:', resp.stop_reason, '| usage:', JSON.stringify(resp.usage))
    if (resp.stop_reason === 'max_tokens') {
      console.log('[training-plan] ERROR: output truncated at max_tokens')
      return new Response(JSON.stringify({
        error: 'Réponse tronquée — le plan est trop long pour les limites actuelles',
        stop_reason: 'max_tokens',
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Tâche 4 — extraction correcte : response.content[0].text
    const textBlock = resp.content.find(b => b.type === 'text')
    const rawText = textBlock?.type === 'text' ? textBlock.text : ''

    if (!rawText) {
      return new Response(JSON.stringify({ error: 'No response from model' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Tâche 3 — try/catch spécifique autour du parse avec log et raw_preview
    let plan: GeneratedPlan
    try {
      plan = parseAndRepair<GeneratedPlan>(rawText)
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      console.log('[training-plan] Parse error:', msg)
      console.log('[training-plan] raw preview (500 chars):', rawText.substring(0, 500))
      return new Response(JSON.stringify({
        error: 'Réponse invalide du modèle',
        raw_preview: rawText.substring(0, 200),
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    console.log('FULL DATA RAW:', JSON.stringify(plan, null, 2))
    const normalized = normalizePlan(plan)
    return new Response(JSON.stringify({ program: normalized }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('[training-plan] Fatal error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
