// ══════════════════════════════════════════════════════════════════
// POST /api/admin/seed-dishes
//   Reconstruit la table `dishes` à partir du catalogue curé
//   (src/lib/dish-catalogue.ts) : plats sportifs FR, macros maîtrisées.
//   Pour chaque plat, va chercher UNE photo représentative sur
//   Spoonacular (recherche par nom). Réservé au créateur.
//
//   Idempotent : remplace intégralement le contenu de `dishes`.
//   Env : SPOONACULAR_API_KEY (photos), SUPABASE_SERVICE_ROLE_KEY,
//         CREATOR_USER_ID.
// ══════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DISH_CATALOGUE, type CatalogueDish } from '@/lib/dish-catalogue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface DishRow {
  spoonacular_id:    null
  name:              string
  category:          string
  cuisine:           null
  kcal_100g:         number
  prot_100g:         number
  gluc_100g:         number
  lip_100g:          number
  default_portion_g: number
  image_url:         string | null
  source:            'manual'
  verified:          boolean
  popularity:        number
}

// Récupère une photo représentative pour un terme (best-effort).
async function fetchPhoto(apiKey: string, q: string): Promise<string | null> {
  try {
    const url = new URL('https://api.spoonacular.com/recipes/complexSearch')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('query', q)
    url.searchParams.set('number', '1')
    url.searchParams.set('sort', 'popularity')
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json() as { results?: Array<{ image?: string }> }
    return data.results?.[0]?.image ?? null
  } catch {
    return null
  }
}

// Mappe une entrée catalogue → ligne dishes (popularité = ordre de liste).
function toRow(d: CatalogueDish, image: string | null, rank: number): DishRow {
  return {
    spoonacular_id:    null,
    name:              d.name,
    category:          d.category,
    cuisine:           null,
    kcal_100g:         d.kcal,
    prot_100g:         d.prot,
    gluc_100g:         d.gluc,
    lip_100g:          d.lip,
    default_portion_g: d.portion,
    image_url:         image,
    source:            'manual',
    verified:          true,
    popularity:        rank,
  }
}

export async function POST(): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const creatorId = process.env.CREATOR_USER_ID ?? ''
  if (!creatorId || user.id !== creatorId) {
    return NextResponse.json({ error: 'Réservé au créateur.' }, { status: 403 })
  }

  const apiKey = process.env.SPOONACULAR_API_KEY ?? ''
  const total  = DISH_CATALOGUE.length

  // ── Photos en parallèle (par lots, pour rester rapide) ───────────
  const images = new Array<string | null>(total).fill(null)
  if (apiKey) {
    const BATCH = 8
    for (let i = 0; i < total; i += BATCH) {
      const slice = DISH_CATALOGUE.slice(i, i + BATCH)
      const photos = await Promise.all(slice.map(d => fetchPhoto(apiKey, d.q)))
      photos.forEach((p, j) => { images[i + j] = p })
    }
  }

  const rows: DishRow[] = DISH_CATALOGUE.map((d, i) => toRow(d, images[i], total - i))
  const withPhoto = rows.filter(r => r.image_url).length

  // ── Reconstruction propre : on remplace tout le contenu ──────────
  const admin = createServiceClient()
  const { error: delErr } = await admin.from('dishes').delete().not('id', 'is', null)
  if (delErr) return NextResponse.json({ error: `Supabase (delete): ${delErr.message}` }, { status: 500 })

  const { error: insErr, count } = await admin.from('dishes').insert(rows, { count: 'exact' })
  if (insErr) return NextResponse.json({ error: `Supabase (insert): ${insErr.message}` }, { status: 500 })

  // Récap par catégorie
  const byCat = new Map<string, number>()
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1)
  const breakdown = [...byCat.entries()].map(([type, c]) => ({ type, count: c }))

  return NextResponse.json({
    ok: true,
    inserted: count ?? rows.length,
    photos: withPhoto,
    total,
    breakdown,
    warning: apiKey ? undefined : 'SPOONACULAR_API_KEY absente — plats créés sans photo.',
  })
}
