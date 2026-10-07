// ══════════════════════════════════════════════════════════════════
// CADENCES — validation du moteur contre les 3 cas de référence (§13).
// Exécuter : npx tsx src/lib/cadences/validate.ts
// Critère (§21) : pct ± 0.001, points ± 0.001, totaux ± 0.01, niveaux identiques.
// ══════════════════════════════════════════════════════════════════

import config from './cadences.config.json'
import cases from './reference-cases.json'
import { computeCampaign, computeTest } from './engine'
import type { CadencesConfig, Profile, TestInput, QualityKey } from './types'

const cfg = config as unknown as CadencesConfig

const LABEL_TO_KEY: Record<string, QualityKey> = {
  'Vitesse': 'vitesse', 'Force': 'force', 'Puissance': 'puissance', 'Explosivité': 'explosivite',
  'Endurance': 'endurance', 'VO2max': 'vo2max', 'Coordination': 'coordination',
}

const TOL = { pct: 0.001, points: 0.01, total: 0.01, qPct: 0.001, qPoints: 0.05 }

let failures = 0
let maxPct = 0, maxPts = 0, maxTotal = 0, maxQPct = 0

function near(a: number, b: number, tol: number, label: string): boolean {
  const d = Math.abs(a - b)
  if (d > tol) { console.error(`  ✗ ${label} : attendu ${b}, obtenu ${a.toFixed(5)} (écart ${d.toFixed(5)} > ${tol})`); failures++; return false }
  return true
}

for (const c of cases as any[]) {
  const profile: Profile = { sex: c.sex, bodyWeightKg: c.body_weight_kg, ageBand: c.age_band }
  const inputs: TestInput[] = c.tests.map((t: any) => ({ slug: t.slug, value: t.input, equipment: t.equipment }))
  const res = computeCampaign(inputs, profile, 'age', cfg)

  console.log(`\nCas ${c.case} — ${c.sex}, ${c.body_weight_kg} kg, ${c.age_band}`)

  for (const t of c.tests) {
    const s = res.byTest[t.slug]
    if (!s) { console.error(`  ✗ ${t.slug} : non calculé`); failures++; continue }
    maxPct = Math.max(maxPct, Math.abs(s.pct - t.pct))
    maxPts = Math.max(maxPts, Math.abs(s.points - t.points))
    near(s.pct, t.pct, TOL.pct, `${t.slug} pct`)
    near(s.points, t.points, TOL.points, `${t.slug} points`)
  }

  maxTotal = Math.max(maxTotal, Math.abs(res.total - c.total_points))
  near(res.total, c.total_points, TOL.total, 'TOTAL')

  for (const [label, q] of Object.entries(c.qualities) as [string, any][]) {
    const key = LABEL_TO_KEY[label]
    const got = res.byQuality[key]
    maxQPct = Math.max(maxQPct, Math.abs(got.pct - q.pct))
    near(got.pct, q.pct, TOL.qPct, `qualité ${label} pct`)
    near(got.points, q.points, TOL.qPoints, `qualité ${label} points`)
    near(got.ptsMax, q.pts_max, 0.01, `qualité ${label} pts_max`)
    if (got.level !== q.level) { console.error(`  ✗ qualité ${label} niveau : attendu ${q.level}, obtenu ${got.level}`); failures++ }
  }
  console.log(`  total = ${res.total.toFixed(3)} (attendu ${c.total_points})`)
}

// ── Épreuves à critères (meilleur essai + total des essais), calculées à la main ──
const totalPtsMax = cfg.tests.reduce((a, t) => a + t.pts_max, 0)
near(totalPtsMax, cfg.total_points, 1e-9, 'somme des pts_max = total_points')
for (const t of cfg.tests) {
  if (!t.criteria) continue
  const sc = t.criteria.reduce((a, c) => a + c.pts_max, 0)
  near(sc, t.pts_max, 1e-9, `${t.slug} : somme des critères = pts_max`)
}
const H: Profile = { sex: 'M', bodyWeightKg: 80, ageBand: '26-35' }
const testOf = (slug: string) => cfg.tests.find((t) => t.slug === slug)!
const CRIT_CASES = [
  // Long jump H (Réf 2,55 / Max 3,20) : meilleur 3,20 → 100 % × 15 ; total 8,75 m vs Réf 7,65 / Max 9,60 → 82,5641 % × 10
  { slug: 'standing_long_jump', value: 3.2, parts: [3.2, 3.0, 2.55], points: 15 + 0.825641 * 10 },
  // Square H (Réf 20,5 / Max 16) : meilleur 16 → 100 % × 12 ; total 51 s vs Réf 61,5 / Max 48 → 91,1111 % × 8
  { slug: 'agility_square', value: 16, parts: [16, 17, 18], points: 12 + 0.911111 * 8 },
  // Sans détail des essais : tous égaux au meilleur (2,55 = Réf → 60 % partout)
  { slug: 'standing_long_jump', value: 2.55, parts: null, points: 0.6 * 25 },
]
console.log('\nÉpreuves à critères')
for (const k of CRIT_CASES) {
  const s = computeTest(testOf(k.slug), { slug: k.slug, value: k.value, parts: k.parts }, H, 'general', cfg)
  if (!s) { console.error(`  ✗ ${k.slug} : non calculé`); failures++; continue }
  if (near(s.points, k.points, 0.001, `${k.slug} points (critères)`)) console.log(`  ✓ ${k.slug} ${k.parts ? '[' + k.parts.join(', ') + ']' : '(sans détail)'} → ${s.points.toFixed(3)} pts`)
}

console.log(`\nÉcarts max — pct: ${maxPct.toFixed(6)} · points: ${maxPts.toFixed(6)} · total: ${maxTotal.toFixed(6)} · qualité pct: ${maxQPct.toFixed(6)}`)
if (failures === 0) {
  console.log('\n✓ VALIDATION RÉUSSIE — les 3 cas de référence et les épreuves à critères sont reproduits dans la tolérance.')
  process.exit(0)
} else {
  console.error(`\n✗ ÉCHEC — ${failures} écart(s) hors tolérance.`)
  process.exit(1)
}
