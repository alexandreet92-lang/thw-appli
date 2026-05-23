import { COMMON_FOODS, type FoodItem } from './common-foods'

export type { FoodItem }

const RECENT_KEY = 'recent_foods'

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

export async function searchFoods(query: string): Promise<{ local: FoodItem[]; api: FoodItem[] }> {
  const q = query.trim().toLowerCase()
  const local = COMMON_FOODS.filter(f => f.product_name.toLowerCase().includes(q))
  const api = await fetchOpenFoodFacts(query)
  const localNames = new Set(local.map(f => f.product_name.toLowerCase()))
  const apiFiltered = api.filter(a => !localNames.has(a.product_name.toLowerCase()))
  return { local, api: apiFiltered.slice(0, 12 - local.length) }
}

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
