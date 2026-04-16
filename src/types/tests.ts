// ══════════════════════════════════════════════════════════════
// Types — Tests de performance THW Coaching
// Frontend + DB (Supabase)
// ══════════════════════════════════════════════════════════════

// ── Frontend ─────────────────────────────────────────────────────
export type TestSport     = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'
export type TestDifficulty = 'Modéré' | 'Intense' | 'Maximal'

export interface TestDef {
  id: string
  name: string
  desc: string
  duration: string
  difficulty: TestDifficulty
}

export interface OpenTest { sport: TestSport; test: TestDef }

// Champ de saisie dans le formulaire
export interface FieldDef {
  cle: string
  label: string
  unite: string | null
  type: 'number' | 'string'
  placeholder?: string
  helper?: string
  required?: boolean
}

// Protocole statique (contenu de référence)
export interface TestProtocol {
  objectif: string
  avertissement?: string
  conditions: string[]
  echauffement: string[]
  etapes: string[]
  interpretation: string[]
  erreurs: string[]
  frequence: string
  fields: FieldDef[]
}

// ── DB types (alignés sur add_tests.sql) ─────────────────────────
export interface TestDefinitionDB {
  id: string
  sport: string
  categorie: string
  nom: string
  description: string
  protocole: string | null
  materiel: { nom: string; obligatoire: boolean }[]
  donnees_a_enregistrer: FieldDefDB[]
  duree_indicative_min: number | null
  niveau_difficulte: number | null
  created_at: string
  updated_at: string
}

export interface FieldDefDB {
  cle: string; label: string; unite: string | null; type: string
}

export interface TestResultDB {
  id: string
  user_id: string
  test_definition_id: string
  date: string
  valeurs: Record<string, unknown>
  notes: string | null
  fichier_url: string | null
  created_at: string
  updated_at: string
  test_files?: TestFileDB[]
}

export interface TestResultInsert {
  user_id: string
  test_definition_id: string
  date: string
  valeurs: Record<string, unknown>
  notes?: string
  fichier_url?: string
}

export type TestFileType = 'fit' | 'gpx' | 'csv' | 'pdf'

export interface TestFileDB {
  id: string
  user_id: string
  test_result_id: string
  nom_fichier: string
  type: TestFileType
  url: string
  taille: number | null
  created_at: string
}
