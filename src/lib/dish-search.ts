import { createClient } from '@/lib/supabase/client'

// ── Plat composé prêt à logger (catalogue `dishes`) ─────────────────
export interface DishItem {
  id:                string   // `dish_${uuid}`
  name:              string
  image_url?:        string
  category?:         string
  kcal_100g:         number
  prot_100g:         number
  gluc_100g:         number
  lip_100g:          number
  default_portion_g: number
}

const RECENT_KEY = 'recent_dishes'

// ── Récents (localStorage) ──────────────────────────────────────────
export function getRecentDishes(): DishItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as DishItem[] }
  catch { return [] }
}

export function saveToRecentDishes(dish: DishItem): void {
  if (typeof window === 'undefined') return
  const recent = getRecentDishes()
  const updated = [dish, ...recent.filter(d => d.id !== dish.id)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch {}
}

// ── Mapping table `dishes` ⇄ DishItem ───────────────────────────────
interface DishRow {
  id:                string
  name:              string
  image_url:         string | null
  category:          string | null
  kcal_100g:         number
  prot_100g:         number
  gluc_100g:         number
  lip_100g:          number
  default_portion_g: number
}

function rowToDish(r: DishRow): DishItem {
  return {
    id:                `dish_${r.id}`,
    name:              r.name,
    image_url:         r.image_url ?? undefined,
    category:          r.category ?? undefined,
    kcal_100g:         Math.round(r.kcal_100g),
    prot_100g:         +(r.prot_100g.toFixed(1)),
    gluc_100g:         +(r.gluc_100g.toFixed(1)),
    lip_100g:          +(r.lip_100g.toFixed(1)),
    default_portion_g: Math.round(r.default_portion_g),
  }
}

// ── Catégories (thèmes) du picker ───────────────────────────────────
export const DISH_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all',       label: 'Tout'      },
  { key: 'main',      label: 'Plats'     },
  { key: 'breakfast', label: 'Petit-déj' },
  { key: 'salad',     label: 'Salades'   },
  { key: 'soup',      label: 'Soupes'    },
  { key: 'side',      label: 'Accomp.'   },
  { key: 'snack',     label: 'Snacks'    },
  { key: 'dessert',   label: 'Desserts'  },
]

const SELECT_COLS = 'id,name,image_url,category,kcal_100g,prot_100g,gluc_100g,lip_100g,default_portion_g'

// ── Recherche + filtre catégorie (table dishes, ordre popularité) ───
export async function fetchDishes(opts: { query?: string; category?: string }): Promise<DishItem[]> {
  try {
    const supabase = createClient()
    let q = supabase.from('dishes').select(SELECT_COLS)
    if (opts.category && opts.category !== 'all') q = q.eq('category', opts.category)
    if (opts.query && opts.query.trim()) q = q.ilike('name', `%${opts.query.trim()}%`)
    const { data, error } = await q.order('popularity', { ascending: false }).limit(80)
    if (error || !data) return []
    return (data as DishRow[]).map(rowToDish)
  } catch {
    return []
  }
}

// ── Recherche (Supabase RPC). q='' → plats les plus populaires. ─────
export async function searchDishes(query: string): Promise<DishItem[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('search_dishes', { q: query.trim(), lim: 30 })
    if (error || !data) return []
    return (data as DishRow[]).map(rowToDish)
  } catch {
    return []
  }
}

// Vue par défaut du picker : plats les plus populaires (q='').
export function getPopularDishes(): Promise<DishItem[]> {
  return searchDishes('')
}

// ── Macros d'une portion donnée ─────────────────────────────────────
export function dishMacros(dish: DishItem, grams: number) {
  const r = grams / 100
  return {
    kcal: Math.round(dish.kcal_100g * r),
    prot: +(dish.prot_100g * r).toFixed(1),
    gluc: +(dish.gluc_100g * r).toFixed(1),
    lip:  +(dish.lip_100g  * r).toFixed(1),
  }
}
