// ══════════════════════════════════════════════════════════════════
// CADENCES — palette fonctionnelle des 7 niveaux (§11).
// Palette SANCTIONNÉE (comme les zones d'intensité / sports du design system) :
// la couleur porte un sens — le niveau de performance. Elle vit ici, dans
// src/lib (hors du scan « zéro couleur en dur »), et les composants l'importent
// sans écrire de littéral couleur. Rampe ascendante danger → excellence, sans
// le violet (réservé à l'IA).
// ══════════════════════════════════════════════════════════════════

export const LEVEL_LABELS = [
  'Sédentaire', 'Amateur', 'Confirmé', 'Référence', 'Élite', 'Phénomène', 'Extraterrestre',
] as const

export const LEVEL_COLORS: Record<string, string> = {
  Sédentaire: '#f87171',
  Amateur: '#fb923c',
  Confirmé: '#fbbf24',
  Référence: '#a3e635',
  Élite: '#4ade80',
  Phénomène: '#2dd4bf',
  Extraterrestre: '#38bdf8',
  // Anciens libellés (scores figés avant le renommage des paliers).
  Faible: '#f87171',
  Insuffisant: '#fb923c',
  Moyen: '#fbbf24',
  Solide: '#4ade80',
  Exceptionnel: '#38bdf8',
}

/** Couleur d'un niveau (gris neutre si inconnu). */
export function levelColor(label: string): string {
  return LEVEL_COLORS[label] ?? '#9ca3af'
}
