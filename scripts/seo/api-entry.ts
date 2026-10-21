// Points d'entrée du prérendu : mêmes fonctions que /api/cadences/products et /api/cadences/catalog
// (données publiques tirées de la config des batteries, aucun secret).
import { productCards, getConfig } from '@/lib/cadences/catalog'
import { buildCatalogView } from '@/lib/cadences/catalogView'

export const products = (): unknown => ({ products: productCards() })
export const catalog = (testKey: string | null): unknown => buildCatalogView(getConfig(testKey))

import { epreuveIndex } from '@/lib/cadences/epreuves'
export const epreuves = (): unknown => ({ epreuves: epreuveIndex() })
export const epreuveList = (): ReturnType<typeof epreuveIndex> => epreuveIndex()
