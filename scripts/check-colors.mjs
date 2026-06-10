#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// check-colors.mjs — garde-fou « zéro couleur en dur »
// DESIGN_SYSTEM.md §2 et §7.1 : aucune couleur littérale (hex / rgb / rgba /
// hsl) dans le code feature. Toute couleur passe par var(--token).
//
// Le code actuel contient une dette (couleurs en dur pré-refonte). Pour
// adopter le garde-fou SANS bloquer le build, on fonctionne en « ratchet » :
// une baseline fige le nombre de violations par fichier ; un run échoue
// uniquement si de NOUVELLES violations apparaissent (ou un fichier neuf en
// introduit). La dette ne peut que diminuer.
//
// Usage :
//   node scripts/check-colors.mjs                  rapport + exit 1 si régression
//   node scripts/check-colors.mjs --list           liste toutes les violations
//   node scripts/check-colors.mjs --strict         échoue sur TOUTE violation
//   node scripts/check-colors.mjs --update-baseline fige la dette actuelle
//
// Exemptions :
//   - fichiers SANCTIONED (tokens, constantes immuables) ;
//   - lignes annotées `design-allow-color` (commentaire sur la ligne).
// ════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const SCAN_DIRS = ['src/app', 'src/components']
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])
const BASELINE_PATH = join(ROOT, 'scripts', '.color-baseline.json')

// Fichiers sanctionnés : définissent les tokens / constantes immuables
// (sport, zones). Exemptés du check (DESIGN_SYSTEM.md §2 « immuables »).
const SANCTIONED = new Set([
  'src/app/globals.css',
])

// Chemins « enforced » : tenus au ZÉRO couleur en dur de façon stricte, vérifiés
// par le gate de build (mode --enforce). À remplir au fur et à mesure de la
// refonte des pages (préfixes de chemin relatif au repo, ex. 'src/app/nutrition').
// Liste VIDE = aucun chemin enforced = le gate de build passe toujours.
// On enforced fichier par fichier (et non le dossier plan/ entier) car
// PlanShoppingList.tsx y conserve de la dette ; page.tsx mélange 4 onglets dont
// 3 non refondus → non enforçable tel quel.
const ENFORCED_PATHS = [
  'src/app/nutrition/components/plan/PlanTab.tsx',
  'src/app/nutrition/components/plan/PlanRhythm.tsx',
  'src/app/nutrition/components/plan/planFormat.ts',
  'src/app/nutrition/components/suivi/SuiviSection.tsx',
  'src/app/nutrition/components/suivi/SuiviCharts.tsx',
  'src/app/nutrition/components/suivi/suiviData.ts',
  'src/app/nutrition/components/today/TodayTab.tsx',
  'src/app/nutrition/components/today/FuelingHero.tsx',
  'src/app/nutrition/components/composition/CompositionTab.tsx',
  'src/app/nutrition/components/composition/WeightGraph.tsx',
  'src/app/nutrition/components/composition/AnnualSheet.tsx',
  'src/app/nutrition/components/composition/MeasureForm.tsx',
  'src/app/nutrition/components/composition/compositionData.ts',
  'src/app/planning/components/training/TrainingSummary.tsx',
  'src/app/calendar/components/GoalBanner.tsx',
  'src/app/calendar/components/AnnualView.tsx',
  'src/app/performance/components/profil/ProfilGlobalGrid.tsx',
  'src/app/performance/components/tests/TestCard.tsx',
  'src/app/injuries/types.ts',
  'src/app/injuries/lib.ts',
  'src/app/injuries/useInjuries.ts',
  'src/app/injuries/page.tsx',
  'src/app/injuries/components/Sheet.tsx',
  'src/app/injuries/components/ReportSheet.tsx',
  'src/app/injuries/components/OverviewTab.tsx',
  'src/app/injuries/components/HistoryTab.tsx',
  'src/app/injuries/components/AnalysisTab.tsx',
  'src/app/injuries/components/TrackSheet.tsx',
]
// Dossiers ignorés sous les SCAN_DIRS.
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', 'build'])

// Littéraux couleur : hex (#rgb/#rgba/#rrggbb/#rrggbbaa) + fonctions rgb/hsl.
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/
const FUNC = /\b(?:rgba?|hsla?)\s*\(/i
const ALLOW = /design-allow-color/

const args = new Set(process.argv.slice(2))

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (EXTENSIONS.has(extname(name))) out.push(full)
  }
  return out
}

function scanFile(full) {
  const rel = relative(ROOT, full).split('\\').join('/')
  if (SANCTIONED.has(rel)) return null
  const lines = readFileSync(full, 'utf8').split('\n')
  const hits = []
  lines.forEach((line, i) => {
    if (ALLOW.test(line)) return
    if (HEX.test(line) || FUNC.test(line)) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120) })
    }
  })
  return hits.length ? { file: rel, hits } : null
}

// ── Collecte ──────────────────────────────────────────────────────────────
const results = []
for (const d of SCAN_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const r = scanFile(f)
    if (r) results.push(r)
  }
}
const counts = Object.fromEntries(results.map(r => [r.file, r.hits.length]))
const total = results.reduce((a, r) => a + r.hits.length, 0)

// ── Mode : enforce (gate de build) ──────────────────────────────────────────
// Ne vérifie strictement que les fichiers sous ENFORCED_PATHS. Liste vide → OK.
if (args.has('--enforce')) {
  if (ENFORCED_PATHS.length === 0) {
    console.log('✓ check:colors (enforce) — aucun chemin enforced, rien à vérifier.')
    process.exit(0)
  }
  const enforced = results.filter(r => ENFORCED_PATHS.some(p => r.file.startsWith(p)))
  const enfTotal = enforced.reduce((a, r) => a + r.hits.length, 0)
  if (enfTotal === 0) {
    console.log(`✓ check:colors (enforce) — 0 couleur en dur dans ${ENFORCED_PATHS.length} chemin(s) enforced.`)
    process.exit(0)
  }
  console.error('✗ Couleurs en dur dans des chemins enforced (DESIGN_SYSTEM.md §2) :')
  for (const r of enforced) {
    console.error(`  ${r.file} (${r.hits.length})`)
    for (const h of r.hits) console.error(`    ${h.line}: ${h.text}`)
  }
  console.error('\nUtilise var(--token), ou annote la ligne `design-allow-color` si justifié.')
  process.exit(1)
}

// ── Mode : update baseline ─────────────────────────────────────────────────
if (args.has('--update-baseline')) {
  writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n')
  console.log(`✓ Baseline écrite : ${total} couleurs en dur dans ${results.length} fichiers.`)
  console.log(`  ${relative(ROOT, BASELINE_PATH)}`)
  process.exit(0)
}

// ── Mode : list ─────────────────────────────────────────────────────────────
if (args.has('--list')) {
  for (const r of results) {
    console.log(`\n${r.file}  (${r.hits.length})`)
    for (const h of r.hits) console.log(`  ${h.line}: ${h.text}`)
  }
  console.log(`\nTotal : ${total} couleurs en dur dans ${results.length} fichiers.`)
  process.exit(total > 0 ? 1 : 0)
}

// ── Mode : strict (toute violation échoue) ──────────────────────────────────
if (args.has('--strict')) {
  if (total === 0) { console.log('✓ Aucune couleur en dur.'); process.exit(0) }
  console.error(`✗ ${total} couleurs en dur (mode strict). Lance --list pour le détail.`)
  process.exit(1)
}

// ── Mode par défaut : ratchet sur baseline ──────────────────────────────────
const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {}

const regressions = []
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0
  if (n > allowed) regressions.push({ file, n, allowed })
}

if (regressions.length === 0) {
  const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0)
  console.log(`✓ Pas de nouvelle couleur en dur. Dette gelée : ${baseTotal} (objectif : 0).`)
  if (!existsSync(BASELINE_PATH)) {
    console.log('  (aucune baseline — lance `node scripts/check-colors.mjs --update-baseline`)')
  }
  process.exit(0)
}

console.error('✗ Nouvelles couleurs en dur détectées (DESIGN_SYSTEM.md §2) :')
for (const r of regressions) {
  console.error(`  ${r.file} : ${r.n} (baseline ${r.allowed})`)
}
console.error('\nUtilise var(--token), ou annote la ligne `design-allow-color` si justifié.')
console.error('Pour figer une nouvelle référence : node scripts/check-colors.mjs --update-baseline')
process.exit(1)
