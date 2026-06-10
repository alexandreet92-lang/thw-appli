// Types & constantes de la page Blessures. TypeScript strict, aucun any.
// Sévérité = couleur fonctionnelle (gene vert, douleur ambre, blessure rouge),
// via tokens de charge réutilisés. Aucune couleur littérale hors tokens.

export type Severity  = 'gene' | 'douleur' | 'blessure'
export type Side      = 'gauche' | 'droit' | 'central'
export type Structure = 'muscle' | 'tendon' | 'articulation' | 'ligament' | 'os' | 'nerf' | 'inconnu'
export type Mechanism = 'soudaine' | 'progressive'
export type Evolution = 'aggrave' | 'stable' | 'ameliore'
export type Phase     = 'aigue' | 'recuperation' | 'reathletisation' | 'resolu'
export type Status    = 'active' | 'resolved'

export interface RehabExo { nom: string; detail: string | null; done: boolean }
export interface Impact   { avoid: string[]; ok: string[] }

export interface Injury {
  id: string
  user_id: string
  severity: Severity
  zone: string
  side: Side | null
  structure: Structure | null
  precision: string | null
  intensity_rest: number | null
  intensity_effort: number | null
  onset_date: string
  mechanism: Mechanism | null
  activity: string | null
  evolution: Evolution | null
  description: string | null
  phase: Phase
  return_estimate_date: string | null
  status: Status
  resolved_date: string | null
  practitioner: string | null
  next_appointment: string | null
  rehab: RehabExo[]
  impact: Impact
  created_at: string
  updated_at: string
}

export interface InjuryLog {
  id: string
  injury_id: string
  log_date: string
  note: string | null
  intensity_rest: number | null
  intensity_effort: number | null
}

export const SEV: Record<Severity, { label: string; varc: string }> = {
  gene:     { label: 'Gêne',     varc: 'var(--charge-low)' },
  douleur:  { label: 'Douleur',  varc: 'var(--charge-mid)' },
  blessure: { label: 'Blessure', varc: 'var(--charge-hard)' },
}

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'aigue',           label: 'Aiguë' },
  { id: 'recuperation',    label: 'Récupération' },
  { id: 'reathletisation', label: 'Réathlétisation' },
  { id: 'resolu',          label: 'Résolu' },
]

export const STRUCTURES: Structure[] = ['muscle', 'tendon', 'articulation', 'ligament', 'os', 'nerf', 'inconnu']
export const SIDES: Side[] = ['gauche', 'droit', 'central']
