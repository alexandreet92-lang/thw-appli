// Ancrage des macros d'un ingrédient sur une référence déterministe (common-foods, valeurs
// type-CIQUAL FR) plutôt que de laisser le modèle deviner les P/L/G.
// ⚠️ common-foods n'est PAS le dataset CIQUAL officiel (cf. PROMPT_NUTRITION_2.md) :
// c'est une table curée FR. À terme, importer CIQUAL dans une table dédiée.
import { COMMON_FOODS } from '@/lib/common-foods'

export interface Per100 { kcal: number; prot: number; gluc: number; lip: number }

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire accents
    .replace(/\([^)]*\)/g, ' ')                        // retire parenthèses
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mots vides à ignorer dans le rapprochement.
const STOP = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'au', 'aux', 'cuit', 'cuite', 'cru', 'crue', 'entier', 'nature'])

function tokens(s: string): string[] {
  return norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w))
}

// Index pré-calculé des aliments de référence.
const REF = COMMON_FOODS.map(f => ({
  toks: tokens(f.product_name),
  per100: {
    kcal: f.nutriments['energy-kcal_100g'],
    prot: f.nutriments.proteins_100g,
    gluc: f.nutriments.carbohydrates_100g,
    lip:  f.nutriments.fat_100g,
  } as Per100,
}))

// Cherche la meilleure correspondance par chevauchement de tokens. null si rien de probant.
export function anchorMacros(name: string): Per100 | null {
  const want = tokens(name)
  if (!want.length) return null
  let best: Per100 | null = null
  let bestScore = 0
  for (const ref of REF) {
    if (!ref.toks.length) continue
    const overlap = ref.toks.filter(t => want.some(w => w === t || w.includes(t) || t.includes(w))).length
    if (!overlap) continue
    const score = overlap / Math.max(ref.toks.length, want.length)
    if (score > bestScore) { bestScore = score; best = ref.per100 }
  }
  return bestScore >= 0.5 ? best : null
}
