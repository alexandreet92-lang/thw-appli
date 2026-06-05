import { COMMON_FOODS, type FoodItem } from './common-foods'
import { createClient } from '@/lib/supabase/client'

export type { FoodItem }

const RECENT_KEY = 'recent_foods'

// ── Récents (localStorage) ──────────────────────────────────────────
export function getRecentFoods(): FoodItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as FoodItem[] }
  catch { return [] }
}

export function saveToRecent(food: FoodItem): void {
  if (typeof window === 'undefined') return
  const recent = getRecentFoods()
  const updated = [food, ...recent.filter(f => f.code !== food.code)].slice(0, 10)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch {}
}

// ── Mapping table `foods` ⇄ FoodItem ────────────────────────────────
interface FoodRow {
  id: string
  barcode: string | null
  name: string
  image_url: string | null
  kcal_100g: number
  prot_100g: number
  gluc_100g: number
  lip_100g: number
}

function rowToItem(r: FoodRow): FoodItem {
  return {
    code: r.barcode ?? `lib_${r.id}`,
    product_name: r.name,
    image_url: r.image_url ?? undefined,
    nutriments: {
      'energy-kcal_100g': Math.round(r.kcal_100g),
      proteins_100g: +(r.prot_100g.toFixed(1)),
      carbohydrates_100g: +(r.gluc_100g.toFixed(1)),
      fat_100g: +(r.lip_100g.toFixed(1)),
    },
  }
}

const isBarcode = (code: string) => /^\d{6,}$/.test(code)

// ── Bibliothèque interne (Supabase) ─────────────────────────────────
async function searchLibrary(query: string): Promise<FoodItem[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('search_foods', { q: query, lim: 20 })
    if (error || !data) return []
    return (data as FoodRow[]).map(rowToItem)
  } catch {
    return []
  }
}

async function lookupLibraryBarcode(code: string): Promise<FoodItem | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('foods')
      .select('id,barcode,name,image_url,kcal_100g,prot_100g,gluc_100g,lip_100g')
      .eq('barcode', code)
      .maybeSingle()
    if (error || !data) return null
    return rowToItem(data as FoodRow)
  } catch {
    return null
  }
}

// ── Cache paresseux : enrichit `foods` avec les produits OFF vus ────
// Fire-and-forget, n'échoue jamais bruyamment. Ne cache que les
// produits ayant un vrai code-barres (dédup via contrainte unique).
export function cacheFoods(items: FoodItem[]): void {
  const rows = items
    .filter(f => isBarcode(f.code))
    .map(f => ({
      barcode: f.code,
      name: f.product_name,
      image_url: f.image_url ?? null,
      kcal_100g: f.nutriments['energy-kcal_100g'],
      prot_100g: f.nutriments.proteins_100g,
      gluc_100g: f.nutriments.carbohydrates_100g,
      lip_100g: f.nutriments.fat_100g,
      source: 'off' as const,
    }))
  if (!rows.length) return
  try {
    const supabase = createClient()
    void supabase.from('foods').upsert(rows, { onConflict: 'barcode', ignoreDuplicates: false })
  } catch {
    /* silencieux : le cache est best-effort */
  }
}

// ── OpenFoodFacts (live, fallback + source de cache) ────────────────
async function fetchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: '1',
      page_size: '10',
      fields: 'product_name,nutriments,image_small_url,code',
      sort_by: 'completeness',
      countries_tags: 'france',
    })
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return []
    const data = await res.json() as { products?: Record<string, unknown>[] }
    return (data.products ?? [])
      .filter(p =>
        typeof p.product_name === 'string' && p.product_name.trim() &&
        typeof (p.nutriments as Record<string, unknown>)?.['energy-kcal_100g'] === 'number' &&
        ((p.nutriments as Record<string, unknown>)['energy-kcal_100g'] as number) > 0
      )
      .map(p => {
        const n = p.nutriments as Record<string, number>
        return {
          code: String(p.code ?? ''),
          product_name: String(p.product_name),
          image_url: typeof p.image_small_url === 'string' ? p.image_small_url : undefined,
          nutriments: {
            'energy-kcal_100g': Math.round(n['energy-kcal_100g'] ?? 0),
            proteins_100g: +((n.proteins_100g ?? 0).toFixed(1)),
            carbohydrates_100g: +((n.carbohydrates_100g ?? 0).toFixed(1)),
            fat_100g: +((n.fat_100g ?? 0).toFixed(1)),
          },
        }
      })
  } catch {
    return []
  }
}

// ── Recherche unifiée ───────────────────────────────────────────────
// `local` : bibliothèque interne (Supabase `foods` + aliments de base)
// `api`   : produits OpenFoodFacts pas encore dans la bibliothèque
export async function searchFoods(query: string): Promise<{ local: FoodItem[]; api: FoodItem[] }> {
  const q = query.trim()
  const qLower = q.toLowerCase()

  // Recherche par code-barres : bibliothèque puis OFF, et on cache.
  if (isBarcode(q)) {
    const libHit = await lookupLibraryBarcode(q)
    if (libHit) return { local: [libHit], api: [] }
    const offHit = await lookupBarcode(q)
    if (offHit) { cacheFoods([offHit]); return { local: [], api: [offHit] } }
    return { local: [], api: [] }
  }

  const [library, offResults] = await Promise.all([
    searchLibrary(q),
    fetchOpenFoodFacts(q),
  ])

  // `local` = bibliothèque interne + aliments de base, dédupliqués par nom
  const commonMatches = COMMON_FOODS.filter(f => f.product_name.toLowerCase().includes(qLower))
  const localNames = new Set<string>()
  const local: FoodItem[] = []
  for (const item of [...library, ...commonMatches]) {
    const key = item.product_name.toLowerCase()
    if (localNames.has(key)) continue
    localNames.add(key)
    local.push(item)
  }

  // `api` = produits OFF pas déjà présents dans `local`
  const apiFiltered = offResults.filter(a => !localNames.has(a.product_name.toLowerCase()))

  // Cache best-effort des nouveaux produits OFF
  if (apiFiltered.length) cacheFoods(apiFiltered)

  return { local: local.slice(0, 15), api: apiFiltered.slice(0, Math.max(0, 12 - local.length)) }
}

// ── Lookup direct d'un code-barres sur OFF ──────────────────────────
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { status: number; product?: Record<string, unknown> }
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = (p.nutriments ?? {}) as Record<string, number>
    if (!p.product_name || !n['energy-kcal_100g']) return null
    return {
      code,
      product_name: String(p.product_name),
      image_url: typeof p.image_small_url === 'string' ? p.image_small_url : undefined,
      nutriments: {
        'energy-kcal_100g': Math.round(n['energy-kcal_100g']),
        proteins_100g: +((n.proteins_100g ?? 0).toFixed(1)),
        carbohydrates_100g: +((n.carbohydrates_100g ?? 0).toFixed(1)),
        fat_100g: +((n.fat_100g ?? 0).toFixed(1)),
      },
    }
  } catch {
    return null
  }
}
