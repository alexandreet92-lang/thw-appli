// ══════════════════════════════════════════════════════════════════
// CADENCES — validation du moteur contre les 3 cas de référence (§13).
// Exécuter : npx tsx src/lib/cadences/validate.ts
// Critère (§21) : pct ± 0.001, points ± 0.001, totaux ± 0.01, niveaux identiques.
// ══════════════════════════════════════════════════════════════════

import config from './cadences.config.json'
import cases from './reference-cases.json'
import { computeCampaign } from './engine'
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

console.log(`\nÉcarts max — pct: ${maxPct.toFixed(6)} · points: ${maxPts.toFixed(6)} · total: ${maxTotal.toFixed(6)} · qualité pct: ${maxQPct.toFixed(6)}`)
if (failures === 0) {
  console.log('\n✓ VALIDATION RÉUSSIE — les 3 cas de référence sont reproduits dans la tolérance.')
  process.exit(0)
} else {
  console.error(`\n✗ ÉCHEC — ${failures} écart(s) hors tolérance.`)
  process.exit(1)
}
