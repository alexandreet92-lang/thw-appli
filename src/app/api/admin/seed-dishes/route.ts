// ══════════════════════════════════════════════════════════════════
// POST /api/admin/seed-dishes
//   Peuple la table `dishes` depuis l'API Spoonacular. Réservé au
//   créateur (CREATOR_USER_ID). Exécuté côté serveur Vercel → accès
//   réseau OK vers Spoonacular. Idempotent (upsert sur spoonacular_id).
//
//   Env requis :
//     SPOONACULAR_API_KEY        — clé Spoonacular (server only)
//     SUPABASE_SERVICE_ROLE_KEY  — déjà présent (insert bypass RLS)
//     CREATOR_USER_ID            — déjà présent (gate)
// ══════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Nutrient { name: string; amount: number; unit: string }
interface SpoonResult {
  id:        number
  title:     string
  image?:    string
  cuisines?: string[]
  nutrition?: {
    nutrients?:        Nutrient[]
    weightPerServing?: { amount: number; unit: string }
  }
}
interface ComplexSearch { results?: SpoonResult[] }

interface DishRow {
  spoonacular_id:    number
  name:              string
  category:          string
  cuisine:           string | null
  kcal_100g:         number
  prot_100g:         number
  gluc_100g:         number
  lip_100g:          number
  default_portion_g: number
  image_url:         string | null
  source:            'spoonacular'
  verified:          boolean
  popularity:        number
}

const CATEGORIES: Array<{ type: string; category: string }> = [
  { type: 'breakfast',   category: 'breakfast' },
  { type: 'main course', category: 'main'      },
  { type: 'salad',       category: 'salad'     },
  { type: 'soup',        category: 'soup'      },
  { type: 'side dish',   category: 'side'      },
  { type: 'snack',       category: 'snack'     },
  { type: 'dessert',     category: 'dessert'   },
  { type: 'appetizer',   category: 'starter'   },
]

function nutrient(nutrients: Nutrient[] | undefined, name: string): number | null {
  const n = nutrients?.find(x => x.name === name)
  return typeof n?.amount === 'number' ? n.amount : null
}

async function fetchCategory(apiKey: string, type: string, category: string, number: number): Promise<DishRow[]> {
  const url = new URL('https://api.spoonacular.com/recipes/complexSearch')
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('type', type)
  url.searchParams.set('number', String(number))
  url.searchParams.set('addRecipeNutrition', 'true')
  url.searchParams.set('sort', 'popularity')
  url.searchParams.set('instructionsRequired', 'false')

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Spoonacular ${type}: HTTP ${res.status}`)
  const data = await res.json() as ComplexSearch

  const rows: DishRow[] = []
  for (const r of data.results ?? []) {
    const nutrients = r.nutrition?.nutrients
    const weightG   = r.nutrition?.weightPerServing?.amount
    const cal       = nutrient(nutrients, 'Calories')
    if (!weightG || weightG <= 0 || cal == null) continue

    const per100 = (v: number | null) => (v == null ? 0 : +(v / weightG * 100).toFixed(2))
    rows.push({
      spoonacular_id:    r.id,
      name:              r.title,
      category,
      cuisine:           Array.isArray(r.cuisines) && r.cuisines.length ? r.cuisines[0] : null,
      kcal_100g:         per100(cal),
      prot_100g:         per100(nutrient(nutrients, 'Protein')),
      gluc_100g:         per100(nutrient(nutrients, 'Carbohydrates')),
      lip_100g:          per100(nutrient(nutrients, 'Fat')),
      default_portion_g: Math.round(weightG),
      image_url:         r.image ?? null,
      source:            'spoonacular',
      verified:          true,
      popularity:        0,
    })
  }
  return rows
}

export async function POST(req: Request): Promise<NextResponse> {
  // ── Gate créateur (serveur) ──────────────────────────────────────
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const creatorId = process.env.CREATOR_USER_ID ?? ''
  if (!creatorId || user.id !== creatorId) {
    return NextResponse.json({ error: 'Réservé au créateur.' }, { status: 403 })
  }

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'SPOONACULAR_API_KEY manquante dans les variables d\'environnement Vercel.' },
      { status: 400 },
    )
  }

  // number/catégorie configurables via body (optionnel)
  let perCategory = 20
  try {
    const body = await req.json() as { number?: number }
    if (typeof body.number === 'number' && body.number > 0 && body.number <= 100) perCategory = body.number
  } catch { /* body vide → défaut */ }

  // ── Fetch Spoonacular ────────────────────────────────────────────
  const breakdown: Array<{ type: string; count: number }> = []
  let all: DishRow[] = []
  for (const cat of CATEGORIES) {
    try {
      const rows = await fetchCategory(apiKey, cat.type, cat.category, perCategory)
      breakdown.push({ type: cat.type, count: rows.length })
      all = all.concat(rows)
    } catch (e) {
      breakdown.push({ type: cat.type, count: 0 })
      console.error('[seed-dishes]', e instanceof Error ? e.message : e)
    }
  }

  // dédup + popularité décroissante = ordre de fetch (populaires d'abord)
  const seen = new Map<number, DishRow>()
  for (const r of all) if (!seen.has(r.spoonacular_id)) seen.set(r.spoonacular_id, r)
  const unique = [...seen.values()]
  unique.forEach((r, i) => { r.popularity = unique.length - i })

  if (!unique.length) {
    return NextResponse.json(
      { error: 'Aucun plat récupéré — clé invalide ou quota Spoonacular épuisé.', breakdown },
      { status: 502 },
    )
  }

  // ── Upsert (service role, bypass RLS) ────────────────────────────
  const admin = createServiceClient()
  const { error, count } = await admin
    .from('dishes')
    .upsert(unique, { onConflict: 'spoonacular_id', count: 'exact' })
  if (error) {
    return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, inserted: count ?? unique.length, breakdown })
}
