// ══════════════════════════════════════════════════════════════════
// CADENCES — index public des épreuves (une page de référencement par épreuve).
// Un slug = une épreuve ; si plusieurs batteries la contiennent, on garde la plus complète
// (Decaform d'abord). Aucune donnée sensible : tout vient de la config des batteries.
// ══════════════════════════════════════════════════════════════════
import { getConfig, productCards } from '@/lib/cadences/catalog'

export interface EpreuveRef {
  slug: string
  name: string
  group: string
  /** Batterie (test_key) dont on affiche protocole et barème. */
  key: string
  /** Nom du fichier de la page, à la racine du site. */
  file: string
}

/** Ordre de préférence : la batterie qui décrit le mieux l'épreuve passe en premier. */
const PRIORITE = ['decaform', 'start', 'senior', 'senior_actif', 'forme', 'teens_15_17', 'teens_13_14', 'kids_11_12', 'kids_8_10']

export const epreuveFile = (slug: string): string => `epreuve-${slug.replace(/_/g, '-')}.html`

export function epreuveIndex(): EpreuveRef[] {
  const keys = productCards().map((c) => c.testKey).sort((a, b) => PRIORITE.indexOf(a) - PRIORITE.indexOf(b))
  const seen = new Map<string, EpreuveRef>()
  for (const key of keys) {
    for (const t of getConfig(key).tests) {
      if (!seen.has(t.slug)) seen.set(t.slug, { slug: t.slug, name: t.name, group: t.group, key, file: epreuveFile(t.slug) })
    }
  }
  return [...seen.values()]
}
