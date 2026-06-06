// ════════════════════════════════════════════════════════════════
// seed-dishes.mjs — peuple la table `dishes` (~150 plats basiques) à
// partir de l'API Spoonacular. À lancer UNE FOIS, depuis une machine
// ayant accès réseau (ta machine locale, ou un environnement avec
// sortie internet — PAS le sandbox Claude qui bloque les API externes).
//
// Prérequis (variables d'environnement, lues depuis .env.local / .env
// ou l'environnement courant) :
//   SPOONACULAR_API_KEY        — https://spoonacular.com/food-api (gratuit)
//   NEXT_PUBLIC_SUPABASE_URL   — URL du projet Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — clé service role (bypass RLS pour le seed)
//
// Usage :
//   npm run seed:dishes
//   DISH_NUMBER=25 npm run seed:dishes        # plus de plats par catégorie
//
// Idempotent : upsert sur spoonacular_id, relançable sans doublon.
// ════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Mini-loader .env (pas de dépendance dotenv) ─────────────────────
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

const API_KEY      = process.env.SPOONACULAR_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const PER_CATEGORY = Number(process.env.DISH_NUMBER || 20)

if (!API_KEY)      { console.error('✗ SPOONACULAR_API_KEY manquant'); process.exit(1) }
if (!SUPABASE_URL) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL manquant'); process.exit(1) }
if (!SERVICE_KEY)  { console.error('✗ SUPABASE_SERVICE_ROLE_KEY manquant'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// type Spoonacular → catégorie interne (meal type simplifié)
const CATEGORIES = [
  { type: 'breakfast',   category: 'breakfast' },
  { type: 'main course', category: 'main'      },
  { type: 'salad',       category: 'salad'     },
  { type: 'soup',        category: 'soup'      },
  { type: 'side dish',   category: 'side'      },
  { type: 'snack',       category: 'snack'     },
  { type: 'dessert',     category: 'dessert'   },
  { type: 'appetizer',   category: 'starter'   },
]

const num = (nutrients, name) => {
  const n = nutrients?.find(x => x.name === name)
  return typeof n?.amount === 'number' ? n.amount : null
}

async function fetchCategory({ type, category }) {
  const url = new URL('https://api.spoonacular.com/recipes/complexSearch')
  url.searchParams.set('apiKey', API_KEY)
  url.searchParams.set('type', type)
  url.searchParams.set('number', String(PER_CATEGORY))
  url.searchParams.set('addRecipeNutrition', 'true')
  url.searchParams.set('sort', 'popularity')
  url.searchParams.set('instructionsRequired', 'false')

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  ✗ ${type}: HTTP ${res.status} — ${(await res.text()).slice(0, 160)}`)
    return []
  }
  const data = await res.json()
  const rows = []
  for (const r of data.results ?? []) {
    const nutrients = r.nutrition?.nutrients
    const weightG   = r.nutrition?.weightPerServing?.amount
    const cal = num(nutrients, 'Calories')
    if (!weightG || weightG <= 0 || cal == null) continue   // besoin du poids pour le per-100g

    const per100 = v => (v == null ? 0 : +(v / weightG * 100).toFixed(2))
    rows.push({
      spoonacular_id:    r.id,
      name:              r.title,
      category,
      cuisine:           Array.isArray(r.cuisines) && r.cuisines.length ? r.cuisines[0] : null,
      kcal_100g:         per100(cal),
      prot_100g:         per100(num(nutrients, 'Protein')),
      gluc_100g:         per100(num(nutrients, 'Carbohydrates')),
      lip_100g:          per100(num(nutrients, 'Fat')),
      default_portion_g: Math.round(weightG),
      image_url:         r.image ?? null,
      source:            'spoonacular',
      verified:          true,
    })
  }
  return rows
}

async function main() {
  console.log(`→ Seed dishes — ${PER_CATEGORY} plats/catégorie × ${CATEGORIES.length} catégories`)
  let all = []
  for (const cat of CATEGORIES) {
    const rows = await fetchCategory(cat)
    console.log(`  • ${cat.type.padEnd(12)} → ${rows.length} plats`)
    all = all.concat(rows)
  }

  // dédup par spoonacular_id + popularité décroissante = ordre de fetch
  const seen = new Map()
  for (const r of all) if (!seen.has(r.spoonacular_id)) seen.set(r.spoonacular_id, r)
  const unique = [...seen.values()]
  unique.forEach((r, i) => { r.popularity = unique.length - i })

  if (!unique.length) {
    console.error('✗ Aucun plat récupéré — vérifie la clé API / le quota.')
    process.exit(1)
  }

  const { error, count } = await supabase
    .from('dishes')
    .upsert(unique, { onConflict: 'spoonacular_id', count: 'exact' })
  if (error) { console.error('✗ Upsert Supabase:', error.message); process.exit(1) }

  console.log(`✓ ${count ?? unique.length} plats insérés / mis à jour dans \`dishes\`.`)
}

main().catch(e => { console.error(e); process.exit(1) })
