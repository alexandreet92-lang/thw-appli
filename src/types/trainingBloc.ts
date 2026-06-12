// Modèle d'un bloc d'entraînement (V1 persistée en localStorage — pas de migration Supabase
// dans ce lot). Plusieurs blocs possibles par sport.
export interface SessionEntry {
  type: string | null // null = non défini
}

export interface TrainingBlocData {
  id: string
  sport: string // clé SPORT_LABELS : 'velo' | 'running' | 'hyrox' | 'natation' | 'muscu'
  name: string // nom libre : « Bloc PMA », « Prépa course »…
  startYear: number
  startWeek: number // numéro de semaine ISO (interne, jamais affiché tel quel)
  durationWeeks: number
  focus: string[] // qualités travaillées
  sessions: SessionEntry[]
  createdAt: string
}
