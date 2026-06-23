// ══════════════════════════════════════════════════════════════════
// Dictionnaires d'affichage (FR) + prescriptions par mode.
// On n'affiche JAMAIS un slug brut dans l'UI : tout passe par LABELS.
// ══════════════════════════════════════════════════════════════════
import type {
  Mode, Equipement, FlagExo, Muscle, Groupe, RegionMuscle,
} from './types'

export const PRESCRIPTIONS: Record<Mode, { charge: string; tempo: string; volume: string }> = {
  'strength':           { charge: '≥85% 1RM', tempo: 'contrôlé',                    volume: '3–5 reps' },
  'explosivite':        { charge: '30–50%',    tempo: 'descente lente / explosion', volume: '3–5 reps' },
  'strength-endurance': { charge: '50–60%',    tempo: 'continu',                    volume: '12–20 reps' },
}

export const GROUPE_LABEL: Record<Groupe, string> = {
  push:    'Push',
  pull:    'Pull',
  legs:    'Legs',
  haltero: 'Haltéro / Mixte',
  core:    'Core / Gainage',
}

export const MODE_LABEL: Record<Mode, string> = {
  'strength':           'Strength',
  'explosivite':        'Explosivité',
  'strength-endurance': 'Strength-endurance',
}

export const EQUIP_LABEL: Record<Equipement, string> = {
  'barre':         'Barre',
  'halteres':      'Haltères',
  'kettlebell':    'Kettlebell',
  'poids-de-corps':'Poids de corps',
  'elastique':     'Élastique',
}

export const FLAG_LABEL: Record<FlagExo, string> = {
  'unilateral': 'Unilatéral',
  'a-encadrer': 'À encadrer',
  'combo':      'Combo',
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  'quadriceps':         'Quadriceps',
  'ischios':            'Ischios',
  'fessiers':           'Fessiers',
  'adducteurs':         'Adducteurs',
  'mollets':            'Mollets',
  'tibial-anterieur':   'Tibial antérieur',
  'pectoraux':          'Pectoraux',
  'deltoide-anterieur': 'Deltoïde antérieur',
  'deltoide-lateral':   'Deltoïde latéral',
  'triceps':            'Triceps',
  'grand-dorsal':       'Grand dorsal',
  'trapeze-inf-moy':    'Trapèze inf./moy.',
  'rhomboides':         'Rhomboïdes',
  'deltoide-posterieur':'Deltoïde postérieur',
  'biceps':             'Biceps',
  'grip':               'Grip',
  'erecteurs':          'Érecteurs du rachis',
  'transverse':         'Transverse',
  'obliques':           'Obliques',
}

export const REGION_LABEL: Record<RegionMuscle, string> = {
  bas:   'Bas du corps',
  push:  'Push',
  pull:  'Pull',
  tronc: 'Tronc',
}

// Muscles regroupés par région — pour la facette « Muscle » du filtre.
export const MUSCLES_PAR_REGION: Record<RegionMuscle, Muscle[]> = {
  bas:   ['quadriceps', 'ischios', 'fessiers', 'adducteurs', 'mollets', 'tibial-anterieur'],
  push:  ['pectoraux', 'deltoide-anterieur', 'deltoide-lateral', 'triceps'],
  pull:  ['grand-dorsal', 'trapeze-inf-moy', 'rhomboides', 'deltoide-posterieur', 'biceps', 'grip'],
  tronc: ['erecteurs', 'transverse', 'obliques'],
}

export const GROUPE_ORDER: Groupe[] = ['push', 'pull', 'legs', 'haltero', 'core']
export const EQUIP_ORDER: Equipement[] = ['barre', 'halteres', 'kettlebell', 'poids-de-corps', 'elastique']
export const MODE_ORDER: Mode[] = ['strength', 'explosivite', 'strength-endurance']
export const REGION_ORDER: RegionMuscle[] = ['bas', 'push', 'pull', 'tronc']
