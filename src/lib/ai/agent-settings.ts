// ══════════════════════════════════════════════════════════════
// Réglages de l'agent « Training » : préférences de comportement du coach
// (ton, détail, format, matériel, contraintes…). Stockées dans
// profiles.ai_agent_training (JSONB, synchronisé). Converties en consigne
// injectée dans le coach quand l'agent Training est actif.
// ══════════════════════════════════════════════════════════════

export interface TrainingAgentSettings {
  focus: string          // sport/discipline prioritaire
  objectif: string       // objectif principal
  ton: string            // ton du coach
  detail: string         // 'concis' | 'equilibre' | 'detaille'
  niveau: string         // 'debutant' | 'intermediaire' | 'avance' | 'elite'
  format: string         // 'simple' | 'structure' | 'visuel'
  periodisation: string  // 'auto' | 'polarise' | 'pyramidal' | 'bloc'
  unites: string         // 'metric' | 'imperial'
  materiel: string[]     // matériel dispo
  jours: number[]        // jours d'entraînement préférés (0=lundi)
  contraintes: string    // contraintes / blessures à toujours considérer
  proactivite: boolean   // suggestions proactives
  science: boolean       // appuyer sur la science / études
  emoji: boolean         // emojis dans les réponses
}

export const DEFAULT_TRAINING_SETTINGS: TrainingAgentSettings = {
  focus: 'auto', objectif: 'auto', ton: 'motivant', detail: 'equilibre',
  niveau: 'auto', format: 'structure', periodisation: 'auto', unites: 'metric',
  materiel: [], jours: [], contraintes: '', proactivite: true, science: false, emoji: true,
}

// Options (valeur → libellé) pour l'UI.
export const FOCUS_OPTS = [['auto', 'Automatique'], ['running', 'Course à pied'], ['cycling', 'Vélo'], ['swimming', 'Natation'], ['trail', 'Trail'], ['triathlon', 'Triathlon'], ['hyrox', 'Hyrox'], ['force', 'Force / muscu'], ['crossfit', 'CrossFit'], ['hybride', 'Hybride']] as const
export const OBJECTIF_OPTS = [['auto', 'Automatique'], ['performance', 'Performance'], ['perte_poids', 'Perte de poids'], ['masse', 'Prise de masse'], ['sante', 'Santé / forme'], ['endurance', 'Endurance'], ['competition', 'Préparation compétition'], ['reprise', 'Reprise / blessure']] as const
export const TON_OPTS = [['motivant', 'Motivant'], ['technique', 'Technique'], ['pedagogue', 'Pédagogue'], ['direct', 'Direct / cash'], ['bienveillant', 'Bienveillant'], ['exigeant', 'Exigeant']] as const
export const DETAIL_OPTS = [['concis', 'Concis'], ['equilibre', 'Équilibré'], ['detaille', 'Détaillé']] as const
export const NIVEAU_OPTS = [['auto', 'Automatique'], ['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['avance', 'Avancé'], ['elite', 'Élite']] as const
export const FORMAT_OPTS = [['simple', 'Texte simple'], ['structure', 'Structuré (titres, listes)'], ['visuel', 'Visuel (tableaux, graphiques)']] as const
export const PERIODISATION_OPTS = [['auto', 'Automatique'], ['polarise', 'Polarisé'], ['pyramidal', 'Pyramidal'], ['bloc', 'Par blocs']] as const
export const UNITES_OPTS = [['metric', 'Métrique (km, kg)'], ['imperial', 'Impérial (mi, lb)']] as const
export const MATERIEL_OPTS = [['salle', 'Salle de sport'], ['home_gym', 'Home gym'], ['home_trainer', 'Home-trainer'], ['piscine', 'Piscine'], ['poids_libres', 'Poids libres'], ['elastiques', 'Élastiques'], ['tapis', 'Tapis de course'], ['aucun', 'Poids du corps']] as const

const LABEL = (opts: readonly (readonly [string, string])[], v: string) => opts.find(o => o[0] === v)?.[1] ?? v
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// ══════════════════════════════════════════════════════════════
// Réglages de l'agent « Coach » : comment l'IA aide un COACH à suivre et faire
// progresser SES athlètes (ton avec les athlètes, priorités & seuils d'alerte,
// proactivité & bilans, spécialités & signature). Stockés dans
// profiles.ai_agent_coach (JSONB). Injectés dans le coach quand l'utilisateur
// est coach.
// ══════════════════════════════════════════════════════════════

export interface CoachAgentSettings {
  // ① Ton & style avec les athlètes
  ton: string            // ton de communication avec les athlètes
  detail: string         // niveau de détail des analyses
  format: string         // format des messages aux athlètes
  // ② Priorités & seuils d'alerte
  priorite: string       // priorité de coaching
  alerte_surcharge: boolean   // alerte auto en cas de surcharge (charge/ACWR)
  alerte_seance_manquee: boolean // alerte si une séance planifiée est manquée
  alerte_fatigue: boolean     // alerte si RPE/sommeil/HRV dégradés
  // ③ Proactivité & bilans
  proactivite: boolean   // signale spontanément ce qui mérite attention
  bilans: string         // fréquence des bilans athlètes ('aucun'|'hebdo'|'mensuel')
  periodisation: string  // périodisation préférée pour les plans
  // ④ Spécialités & signature
  specialites: string[]  // sports/disciplines encadrés
  signature: string      // nom d'affichage / signature du coach
  langue: string         // langue par défaut des messages ('auto'|'fr'|'en'|'es')
}

export const DEFAULT_COACH_SETTINGS: CoachAgentSettings = {
  ton: 'bienveillant', detail: 'equilibre', format: 'structure',
  priorite: 'auto', alerte_surcharge: true, alerte_seance_manquee: true, alerte_fatigue: true,
  proactivite: true, bilans: 'hebdo', periodisation: 'auto',
  specialites: [], signature: '', langue: 'auto',
}

// Options (valeur → libellé) pour l'UI de l'agent Coach.
export const COACH_TON_OPTS = [['bienveillant', 'Bienveillant'], ['exigeant', 'Exigeant'], ['direct', 'Direct / cash'], ['pedagogue', 'Pédagogue'], ['motivant', 'Motivant'], ['technique', 'Technique']] as const
export const COACH_PRIORITE_OPTS = [['auto', 'Automatique'], ['performance', 'Performance'], ['sante', 'Santé & longévité'], ['adherence', 'Adhérence / régularité'], ['prevention', 'Prévention des blessures']] as const
export const COACH_BILANS_OPTS = [['aucun', 'Aucun'], ['hebdo', 'Hebdomadaire'], ['mensuel', 'Mensuel']] as const
export const COACH_LANGUE_OPTS = [['auto', 'Automatique'], ['fr', 'Français'], ['en', 'Anglais'], ['es', 'Espagnol']] as const

// Réutilise les listes de l'agent Training : DETAIL_OPTS, FORMAT_OPTS,
// PERIODISATION_OPTS, et FOCUS_OPTS (hors 'auto') pour les spécialités.
export const COACH_SPECIALITE_OPTS = FOCUS_OPTS.filter(([v]) => v !== 'auto')

// Construit la consigne injectée dans le coach à partir des réglages Coach.
export function buildCoachAgentInstruction(s: CoachAgentSettings): string {
  const parts: string[] = []
  parts.push(`Ton avec les athlètes : ${LABEL(COACH_TON_OPTS, s.ton)}.`)
  parts.push(`Niveau de détail des analyses : ${LABEL(DETAIL_OPTS, s.detail)}.`)
  parts.push(`Format des messages aux athlètes : ${LABEL(FORMAT_OPTS, s.format)}.`)
  if (s.priorite !== 'auto') parts.push(`Priorité de coaching : ${LABEL(COACH_PRIORITE_OPTS, s.priorite)}.`)
  const alertes: string[] = []
  if (s.alerte_surcharge) alertes.push('surcharge / charge d\'entraînement anormale')
  if (s.alerte_seance_manquee) alertes.push('séance planifiée manquée')
  if (s.alerte_fatigue) alertes.push('fatigue (RPE, sommeil, HRV dégradés)')
  if (alertes.length) parts.push(`Signale proactivement ces situations chez les athlètes : ${alertes.join(', ')}.`)
  parts.push(s.proactivite ? "Sois proactif : mets en avant ce qui mérite l'attention du coach sans qu'on te le demande." : 'Ne signale que ce qui est explicitement demandé.')
  if (s.bilans !== 'aucun') parts.push(`Propose des bilans athlètes à fréquence ${LABEL(COACH_BILANS_OPTS, s.bilans)}.`)
  if (s.periodisation !== 'auto') parts.push(`Périodisation préférée pour les plans : ${LABEL(PERIODISATION_OPTS, s.periodisation)}.`)
  if (s.specialites.length) parts.push(`Disciplines encadrées : ${s.specialites.map(v => LABEL(FOCUS_OPTS, v)).join(', ')}.`)
  if (s.signature.trim()) parts.push(`Signe les messages aux athlètes au nom de : ${s.signature.trim()}.`)
  if (s.langue !== 'auto') parts.push(`Langue par défaut des messages aux athlètes : ${LABEL(COACH_LANGUE_OPTS, s.langue)}.`)
  return `Préférences de coaching (agent Coach — l'utilisateur est coach de ses athlètes) — respecte-les : ${parts.join(' ')}`
}

// Construit la consigne injectée dans le coach à partir des réglages.
export function buildTrainingAgentInstruction(s: TrainingAgentSettings): string {
  const parts: string[] = []
  if (s.focus !== 'auto') parts.push(`Discipline prioritaire : ${LABEL(FOCUS_OPTS, s.focus)}.`)
  if (s.objectif !== 'auto') parts.push(`Objectif principal : ${LABEL(OBJECTIF_OPTS, s.objectif)}.`)
  parts.push(`Ton : ${LABEL(TON_OPTS, s.ton)}.`)
  parts.push(`Niveau de détail des réponses : ${LABEL(DETAIL_OPTS, s.detail)}.`)
  if (s.niveau !== 'auto') parts.push(`Niveau de l'athlète : ${LABEL(NIVEAU_OPTS, s.niveau)} (adapte le vocabulaire technique).`)
  parts.push(`Format préféré : ${LABEL(FORMAT_OPTS, s.format)}.`)
  if (s.periodisation !== 'auto') parts.push(`Périodisation préférée : ${LABEL(PERIODISATION_OPTS, s.periodisation)}.`)
  parts.push(`Unités : ${LABEL(UNITES_OPTS, s.unites)}.`)
  if (s.materiel.length) parts.push(`Matériel disponible : ${s.materiel.map(m => LABEL(MATERIEL_OPTS, m)).join(', ')}.`)
  if (s.jours.length) parts.push(`Jours d'entraînement préférés : ${s.jours.map(d => DAYS[d]).join(', ')}.`)
  if (s.contraintes.trim()) parts.push(`Contraintes / blessures à TOUJOURS prendre en compte : ${s.contraintes.trim()}.`)
  parts.push(s.proactivite ? "Propose spontanément des suggestions utiles quand c'est pertinent." : 'Ne propose pas de suggestions non demandées.')
  if (s.science) parts.push('Appuie tes recommandations sur la science quand pertinent.')
  parts.push(s.emoji ? 'Tu peux utiliser des emojis avec parcimonie.' : "N'utilise pas d'emojis.")
  return `Préférences de coaching de l'athlète (agent Training) — respecte-les : ${parts.join(' ')}`
}
