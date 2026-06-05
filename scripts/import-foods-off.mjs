// ══════════════════════════════════════════════════════════════════
// Seed de la bibliothèque d'aliments `foods` depuis OpenFoodFacts.
//
// Importe les produits France les plus scannés (les plus utiles au
// quotidien) avec leurs macros + photo, en upsert idempotent sur le
// code-barres. Relançable sans créer de doublons.
//
// Prérequis (variables d'environnement) :
//   NEXT_PUBLIC_SUPABASE_URL    = https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = <clé service_role>  (bypass RLS)
//
// Lancement :
//   node scripts/import-foods-off.mjs            # ~3000 produits
//   PAGES=50 node scripts/import-foods-off.mjs   # ~5000 produits
// ══════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans l\'environnement.')
  process.exit(1)
}

const PAGE_SIZE = 100
const PAGES = Number(process.env.PAGES ?? 30)   // 30 × 100 = ~3000 produits
const BATCH = 500

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null)
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10)

function mapProduct(p) {
  const n = p.nutriments ?? {}
  const kcal = num(n['energy-kcal_100g'])
  const name = typeof p.product_name === 'string' ? p.product_name.trim() : ''
  const code = String(p.code ?? '').trim()
  if (!name || !code || kcal == null || kcal <= 0) return null
  return {
    barcode: code,
    name,
    brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() || null : null,
    category: typeof p.categories === 'string' ? p.categories.split(',').pop().trim() || null : null,
    kcal_100g: Math.round(kcal),
    prot_100g: round1(num(n.proteins_100g)) ?? 0,
    gluc_100g: round1(num(n.carbohydrates_100g)) ?? 0,
    lip_100g: round1(num(n.fat_100g)) ?? 0,
    fibres_100g: round1(num(n.fiber_100g)),
    sucres_100g: round1(num(n.sugars_100g)),
    satures_100g: round1(num(n['saturated-fat_100g'])),
    sodium_100g: round1(num(n.sodium_100g)),
    image_url: typeof p.image_small_url === 'string' ? p.image_small_url : null,
    source: 'off',
    verified: false,
  }
}

async function fetchPage(page) {
  const params = new URLSearchParams({
    action: 'process',
    json: '1',
    page_size: String(PAGE_SIZE),
    page: String(page),
    sort_by: 'unique_scans_n',
    countries_tags: 'france',
    fields: 'code,product_name,brands,categories,nutriments,image_small_url',
  })
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'THW-Coaching/1.0 (nutrition food library import)' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return Array.isArray(data.products) ? data.products : []
    } catch (err) {
      if (attempt === 2) { console.warn(`  ! page ${page} échouée: ${err.message}`); return [] }
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  return []
}

async function upsertBatch(rows) {
  const { error } = await supabase
    .from('foods')
    .upsert(rows, { onConflict: 'barcode', ignoreDuplicates: false })
  if (error) console.warn(`  ! upsert: ${error.message}`)
}

async function main() {
  console.log(`▶ Import OpenFoodFacts → foods (${PAGES} pages × ${PAGE_SIZE})`)
  const seen = new Set()
  let buffer = []
  let total = 0

  for (let page = 1; page <= PAGES; page++) {
    const products = await fetchPage(page)
    if (!products.length) { console.log(`  · page ${page}: vide, arrêt`); break }

    for (const p of products) {
      const row = mapProduct(p)
      if (!row || seen.has(row.barcode)) continue
      seen.add(row.barcode)
      buffer.push(row)
    }

    if (buffer.length >= BATCH) {
      await upsertBatch(buffer)
      total += buffer.length
      console.log(`  ✓ ${total} produits importés (page ${page})`)
      buffer = []
    }
    await new Promise(r => setTimeout(r, 400))   // courtoisie envers l'API OFF
  }

  if (buffer.length) {
    await upsertBatch(buffer)
    total += buffer.length
  }

  const { count } = await supabase.from('foods').select('*', { count: 'exact', head: true })
  console.log(`✔ Terminé. ${total} produits traités. Total en base : ${count ?? '?'}`)
}

main().catch(err => { console.error(err); process.exit(1) })
