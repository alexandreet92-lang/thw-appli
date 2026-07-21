// ══════════════════════════════════════════════════════════════
// Liste de métiers (FR) pour le champ « description de votre travail ».
// Sert au coach à adapter charge / récupération (métier physique vs bureau).
// Recherche insensible aux accents/casse via `matchProfessions`.
// ══════════════════════════════════════════════════════════════

export const PROFESSIONS: string[] = [
  // Bureau / tertiaire
  'Employé de bureau', 'Cadre / manager', 'Dirigeant / entrepreneur', 'Commercial',
  'Comptable / finance', 'Ingénieur', 'Développeur / informatique', 'Consultant',
  'Juriste / avocat', 'Ressources humaines', 'Marketing / communication',
  'Fonctionnaire administratif',
  // Santé
  'Médecin', 'Infirmier', 'Kinésithérapeute', 'Aide-soignant', 'Pharmacien', 'Dentiste',
  // Éducation
  'Enseignant / professeur', 'Formateur', 'Éducateur',
  // Sport
  'Coach sportif', 'Préparateur physique', 'Athlète professionnel', 'Professeur de sport',
  // Métiers physiques / terrain
  'Artisan (bâtiment)', 'Ouvrier / manutentionnaire', 'Électricien', 'Plombier',
  'Menuisier', 'Mécanicien', 'Agriculteur', 'Chauffeur / livreur',
  'Cuisinier / restauration', 'Serveur', 'Agent d’entretien', 'Jardinier / paysagiste',
  'Pompier', 'Militaire', 'Policier / gendarme', 'Agent de sécurité',
  // Services / vente
  'Vendeur / commerce', 'Coiffeur / esthétique', 'Boulanger / pâtissier',
  // Créatif / autres
  'Artiste / créatif', 'Journaliste', 'Architecte', 'Photographe',
  // Statuts
  'Étudiant', 'Sans emploi', 'Retraité', 'Parent au foyer', 'Autre',
]

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function matchProfessions(query: string, limit = 40): string[] {
  const q = normalize(query.trim())
  if (!q) return PROFESSIONS.slice(0, limit)
  return PROFESSIONS.filter(p => normalize(p).includes(q)).slice(0, limit)
}
