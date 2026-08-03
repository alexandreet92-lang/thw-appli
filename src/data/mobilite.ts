// ══════════════════════════════════════════════════════════════════
// Bibliothèque MOBILITÉ — catalogue d'exercices d'amplitude articulaire,
// classés par région du corps. Chaque exercice porte un défaut de TENUE
// (secondes) ou de RÉPÉTITIONS, et un drapeau « par côté ». Time/hold-based,
// jamais de charge. Utilisé par le MobilityBuilder du Planning.
//
// Sources (routines mobilité full-body par région) :
//  - pliability.com/stories/mobility-exercises (35 exercices hanches/dos/épaules)
//  - trainheroic.com/blog/mobility-exercises-2 (guide tête aux pieds)
//  - planetfitness.com/blog/articles/full-body-mobility-routine
// ══════════════════════════════════════════════════════════════════

export type MobilityRegion =
  | 'cou' | 'epaules' | 'thoracique' | 'poignets' | 'hanches'
  | 'ischios' | 'chevilles' | 'colonne' | 'fullbody'

export const MOBILITY_REGION_LABEL: Record<MobilityRegion, string> = {
  cou: 'Cou', epaules: 'Épaules', thoracique: 'Thoracique', poignets: 'Poignets',
  hanches: 'Hanches', ischios: 'Ischios', chevilles: 'Chevilles / Mollets',
  colonne: 'Colonne / Dos', fullbody: 'Full body',
}

// Ordre d'affichage (tête → pieds → global).
export const MOBILITY_REGION_ORDER: MobilityRegion[] = [
  'cou', 'epaules', 'thoracique', 'poignets', 'colonne', 'hanches', 'ischios', 'chevilles', 'fullbody',
]

export interface MobilityExo {
  id: string
  nom: string
  region: MobilityRegion
  /** Mesure par défaut : tenue en secondes (hold) OU répétitions. */
  mode: 'hold' | 'reps'
  holdSec?: number
  reps?: number
  /** Travail par côté (gauche/droite) → la tenue/reps s'applique à chaque côté. */
  perSide?: boolean
}

export const MOBILITY_LIBRARY: MobilityExo[] = [
  // ── Cou ──
  { id: 'cou_rotations', nom: 'Rotations du cou', region: 'cou', mode: 'reps', reps: 8 },
  { id: 'cou_inclinaisons', nom: 'Inclinaisons latérales', region: 'cou', mode: 'hold', holdSec: 20, perSide: true },
  { id: 'cou_flexion_ext', nom: 'Flexion / extension', region: 'cou', mode: 'reps', reps: 8 },
  { id: 'cou_chin_tuck', nom: 'Rétraction cervicale (chin tuck)', region: 'cou', mode: 'reps', reps: 10 },

  // ── Épaules ──
  { id: 'ep_cercles_bras', nom: 'Cercles de bras', region: 'epaules', mode: 'reps', reps: 12 },
  { id: 'ep_rotations', nom: 'Rotations d’épaules', region: 'epaules', mode: 'reps', reps: 12 },
  { id: 'ep_dislocations', nom: 'Dislocations au bâton / élastique', region: 'epaules', mode: 'reps', reps: 10 },
  { id: 'ep_wall_slides', nom: 'Wall slides (glissés au mur)', region: 'epaules', mode: 'reps', reps: 10 },
  { id: 'ep_cross_body', nom: 'Étirement croisé (cross-body)', region: 'epaules', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ep_sleeper', nom: 'Sleeper stretch', region: 'epaules', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ep_rot_ext_bande', nom: 'Rotations externes à l’élastique', region: 'epaules', mode: 'reps', reps: 12, perSide: true },

  // ── Thoracique ──
  { id: 'th_open_book', nom: 'Livre ouvert (open book)', region: 'thoracique', mode: 'reps', reps: 8, perSide: true },
  { id: 'th_thread_needle', nom: 'Enfiler l’aiguille (thread the needle)', region: 'thoracique', mode: 'reps', reps: 8, perSide: true },
  { id: 'th_ext_foam', nom: 'Extension thoracique sur rouleau', region: 'thoracique', mode: 'reps', reps: 10 },
  { id: 'th_quad_rot', nom: 'Rotation quadrupédie main-nuque', region: 'thoracique', mode: 'reps', reps: 10, perSide: true },
  { id: 'th_sphinx', nom: 'Sphinx', region: 'thoracique', mode: 'hold', holdSec: 30 },

  // ── Poignets ──
  { id: 'po_cercles', nom: 'Cercles de poignets', region: 'poignets', mode: 'reps', reps: 12 },
  { id: 'po_flex_ext', nom: 'Étirement fléchisseurs / extenseurs', region: 'poignets', mode: 'hold', holdSec: 25, perSide: true },
  { id: 'po_priere', nom: 'Prière (prayer stretch)', region: 'poignets', mode: 'hold', holdSec: 30 },

  // ── Colonne / Dos ──
  { id: 'co_cat_cow', nom: 'Chat-vache (cat-cow)', region: 'colonne', mode: 'reps', reps: 10 },
  { id: 'co_child', nom: 'Posture de l’enfant (child’s pose)', region: 'colonne', mode: 'hold', holdSec: 40 },
  { id: 'co_cobra', nom: 'Cobra', region: 'colonne', mode: 'hold', holdSec: 25 },
  { id: 'co_supine_twist', nom: 'Rotation lombaire allongée', region: 'colonne', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'co_bird_dog', nom: 'Bird dog', region: 'colonne', mode: 'reps', reps: 10, perSide: true },
  { id: 'co_pelvic_tilt', nom: 'Bascule du bassin (pelvic tilt)', region: 'colonne', mode: 'reps', reps: 12 },

  // ── Hanches ──
  { id: 'ha_90_90', nom: '90/90', region: 'hanches', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ha_pigeon', nom: 'Pigeon', region: 'hanches', mode: 'hold', holdSec: 40, perSide: true },
  { id: 'ha_low_lunge', nom: 'Fente basse (fléchisseurs de hanche)', region: 'hanches', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ha_hip_cars', nom: 'Cercles de hanche (hip CARs)', region: 'hanches', mode: 'reps', reps: 6, perSide: true },
  { id: 'ha_butterfly', nom: 'Papillon (butterfly)', region: 'hanches', mode: 'hold', holdSec: 40 },
  { id: 'ha_frog', nom: 'Grenouille (frog stretch)', region: 'hanches', mode: 'hold', holdSec: 40 },
  { id: 'ha_deep_squat', nom: 'Squat profond tenu', region: 'hanches', mode: 'hold', holdSec: 45 },
  { id: 'ha_fire_hydrant', nom: 'Fire hydrants', region: 'hanches', mode: 'reps', reps: 12, perSide: true },
  { id: 'ha_cossack', nom: 'Cossack squat (adducteurs)', region: 'hanches', mode: 'reps', reps: 8, perSide: true },
  { id: 'ha_leg_swings', nom: 'Balancements de jambe', region: 'hanches', mode: 'reps', reps: 12, perSide: true },

  // ── Ischios ──
  { id: 'is_standing', nom: 'Étirement ischio debout', region: 'ischios', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'is_jefferson', nom: 'Jefferson curl', region: 'ischios', mode: 'reps', reps: 8 },
  { id: 'is_good_morning', nom: 'Good morning au poids du corps', region: 'ischios', mode: 'reps', reps: 12 },
  { id: 'is_toe_touch', nom: 'Toe touch (mains aux orteils)', region: 'ischios', mode: 'hold', holdSec: 30 },
  { id: 'is_sweep', nom: 'Hamstring sweep', region: 'ischios', mode: 'reps', reps: 10, perSide: true },
  { id: 'is_supine_bande', nom: 'Ischio allongé à l’élastique', region: 'ischios', mode: 'hold', holdSec: 30, perSide: true },

  // ── Chevilles / Mollets ──
  { id: 'ch_ankle_rocks', nom: 'Dorsiflexion genou-mur (ankle rocks)', region: 'chevilles', mode: 'reps', reps: 12, perSide: true },
  { id: 'ch_cercles', nom: 'Cercles de cheville', region: 'chevilles', mode: 'reps', reps: 12, perSide: true },
  { id: 'ch_gastroc', nom: 'Étirement mollet (gastrocnémien)', region: 'chevilles', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ch_soleaire', nom: 'Étirement mollet (soléaire)', region: 'chevilles', mode: 'hold', holdSec: 30, perSide: true },
  { id: 'ch_heel_raises', nom: 'Montées sur pointes lentes', region: 'chevilles', mode: 'reps', reps: 15 },

  // ── Full body / flow ──
  { id: 'fb_wgs', nom: 'World’s greatest stretch', region: 'fullbody', mode: 'reps', reps: 6, perSide: true },
  { id: 'fb_inchworm', nom: 'Inchworm (chenille)', region: 'fullbody', mode: 'reps', reps: 8 },
  { id: 'fb_down_cobra', nom: 'Chien tête en bas → cobra', region: 'fullbody', mode: 'reps', reps: 8 },
  { id: 'fb_squat_to_stand', nom: 'Squat profond → debout', region: 'fullbody', mode: 'reps', reps: 10 },
  { id: 'fb_sun_salutation', nom: 'Salutation au soleil', region: 'fullbody', mode: 'reps', reps: 5 },
]

export function mobilityById(id: string): MobilityExo | undefined {
  return MOBILITY_LIBRARY.find(e => e.id === id)
}
