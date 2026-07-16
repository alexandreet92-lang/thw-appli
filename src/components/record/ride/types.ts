// Types du domaine « séance home trainer ». Aucune valeur athlète ici : le FTP
// et les cibles watts sont fournis à l'exécution depuis le profil / la séance.

/** Un intervalle aplati de la séance (les répétitions sont déjà déroulées). */
export interface RideBlock {
  name: string
  kind: 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'block'
  durationS: number
  targetW: number          // watts absolus (dérivés de la séance planifiée)
  rep?: number             // n° de répétition dans une série (1-based)
  of?: number              // nombre total de répétitions de la série
  t0: number               // début cumulé (s)
  t1: number               // fin cumulée (s)
}

/** Profil de séance résolu (issu de planned_sessions) ou null = sortie libre. */
export interface RidePlan {
  title: string
  blocks: RideBlock[]
  totalS: number
}

/** Échantillon enregistré à 1 Hz (aligné sur les colonnes streams de activities). */
export interface RideSample {
  t: number                // seconde écoulée
  power: number | null
  hr: number | null
  cadence: number | null
}

/** Métriques dérivées, recalculées à chaque rendu. */
export interface RideMetrics {
  smoothW: number          // puissance lissée 3 s (valeur AFFICHÉE)
  avgW: number
  np: number               // normalized power (moyenne d'ordre 4)
  if: number               // intensity factor (NP / FTP)
  kj: number
  hrAvg: number
  hrMax: number
  cadAvg: number
  zoneTimeS: number        // temps dans la zone courante
}
