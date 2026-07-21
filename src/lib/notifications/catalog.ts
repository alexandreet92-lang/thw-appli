// ══════════════════════════════════════════════════════════════
// Catalogue serveur des notifications : clés STABLES « catégorie.nom »
// + valeur par défaut (utilisée quand l'utilisateur n'a jamais touché le
// toggle). DOIT rester aligné avec NOTIF_CATEGORIES (src/app/profile/page.tsx).
// ══════════════════════════════════════════════════════════════

export type NotifKey =
  | 'entrainement.rappel_seance' | 'entrainement.programme_matin' | 'entrainement.seance_a_venir'
  | 'entrainement.nouveau_plan' | 'entrainement.rappel_enregistrement' | 'entrainement.test_suggere'
  | 'entrainement.seance_telechargee'
  | 'recuperation.rappel_hrv' | 'recuperation.suivi_sommeil' | 'recuperation.alerte_fatigue'
  | 'recuperation.recup_recommandee' | 'recuperation.conseils_post_seance'
  | 'nutrition.rappel_repas' | 'nutrition.hydratation' | 'nutrition.timing_nutritionnel'
  | 'nutrition.recharge_glucidique' | 'nutrition.plan_nutrition'
  | 'performance.resume_hebdo' | 'performance.resume_mensuel' | 'performance.progression'
  | 'performance.evolution_charge' | 'performance.zones_maj'
  | 'coach.suggestions' | 'coach.briefing' | 'coach.analyse_terminee' | 'coach.competences'
  | 'coach.reponse_terminee'
  | 'tokens.quota_80' | 'tokens.quota_95' | 'tokens.quota_epuise' | 'tokens.pack_credite'
  | 'tokens.plan_expiration' | 'tokens.paiement_echoue'
  | 'connexions.activite_synchro' | 'connexions.donnee_importee' | 'connexions.reconnexion'
  | 'connexions.echec_sync'
  | 'competitions.j7' | 'competitions.j3' | 'competitions.j1' | 'competitions.strategie_dispo'
  | 'systeme.nouvelle_version' | 'systeme.nouvelle_feature' | 'systeme.maintenance' | 'systeme.astuce'

export const NOTIF_DEFAULTS: Record<NotifKey, boolean> = {
  'entrainement.rappel_seance': true,
  'entrainement.programme_matin': true,
  'entrainement.seance_a_venir': false,
  'entrainement.nouveau_plan': true,
  'entrainement.rappel_enregistrement': false,
  'entrainement.test_suggere': false,
  'entrainement.seance_telechargee': true,
  'recuperation.rappel_hrv': true,
  'recuperation.suivi_sommeil': false,
  'recuperation.alerte_fatigue': true,
  'recuperation.recup_recommandee': true,
  'recuperation.conseils_post_seance': false,
  'nutrition.rappel_repas': false,
  'nutrition.hydratation': false,
  'nutrition.timing_nutritionnel': false,
  'nutrition.recharge_glucidique': true,
  'nutrition.plan_nutrition': true,
  'performance.resume_hebdo': true,
  'performance.resume_mensuel': false,
  'performance.progression': true,
  'performance.evolution_charge': false,
  'performance.zones_maj': false,
  'coach.suggestions': true,
  'coach.briefing': true,
  'coach.analyse_terminee': false,
  'coach.competences': false,
  'coach.reponse_terminee': true,
  'tokens.quota_80': true,
  'tokens.quota_95': true,
  'tokens.quota_epuise': true,
  'tokens.pack_credite': true,
  'tokens.plan_expiration': true,
  'tokens.paiement_echoue': true,
  'connexions.activite_synchro': false,
  'connexions.donnee_importee': false,
  'connexions.reconnexion': true,
  'connexions.echec_sync': true,
  'competitions.j7': true,
  'competitions.j3': true,
  'competitions.j1': true,
  'competitions.strategie_dispo': true,
  'systeme.nouvelle_version': true,
  'systeme.nouvelle_feature': true,
  'systeme.maintenance': false,
  'systeme.astuce': false,
}

export function defaultFor(key: string): boolean {
  return NOTIF_DEFAULTS[key as NotifKey] ?? false
}
