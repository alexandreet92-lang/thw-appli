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
