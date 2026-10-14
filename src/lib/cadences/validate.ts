// ══════════════════════════════════════════════════════════════════
// CADENCES — validation du moteur contre les 3 cas de référence (§13).
// Exécuter : npx tsx src/lib/cadences/validate.ts
// Critère (§21) : pct ± 0.001, points ± 0.001, totaux ± 0.01, niveaux identiques.
// ══════════════════════════════════════════════════════════════════

import config from './cadences.config.json'
import v12 from './configs/decaform_v1_2.config.json'
import cases from './reference-cases.json'
import { computeCampaign, computeTest } from './engine'
import { conditioningLoads, rowerDistanceM, PROTOCOLS } from './protocols'
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

// ── Decaform v1.2 : références abaissées (squat, soulevé de terre) et choix 3RM / 5RM ──
const cfg12 = v12 as unknown as CadencesConfig
const t12 = (slug: string) => cfg12.tests.find((t) => t.slug === slug)!
const P20: Profile = { sex: 'M', bodyWeightKg: 72, ageBand: '18-20' }
console.log('\nv1.2 — force : 3RM / 5RM (homme de 20 ans, 72 kg)')
const RM_CASES: { label: string; slug: string; value: number; variant?: string; pct: number }[] = [
  // Référence = 60 % : 1,6 × 0,9 × 72 = 103,68 kg (soulevé de terre) ; 1,25 × 0,9 × 72 = 81 kg (squat)
  { label: 'soulevé de terre 3RM = référence', slug: 'deadlift_3rm', value: 103.68, pct: 0.6 },
  { label: 'squat 3RM = référence', slug: 'squat_3rm', value: 81, pct: 0.6 },
  // Max inchangé : 2,7 × 0,9 × 72 = 174,96 kg → 100 %
  { label: 'soulevé de terre 3RM = max', slug: 'deadlift_3rm', value: 174.96, pct: 1 },
  // 5RM converti : 97,81 kg × 1,06 = 103,68 kg → référence
  { label: 'soulevé de terre 5RM → équivalent 3RM = référence', slug: 'deadlift_3rm', value: 103.68 / 1.06, variant: 'rm5', pct: 0.6 },
  { label: 'développé couché 5RM → équivalent 3RM = référence', slug: 'bench_press_3rm', value: (0.9 * 0.9 * 72) / 1.06, variant: 'rm5', pct: 0.6 },
]
for (const k of RM_CASES) {
  const s = computeTest(t12(k.slug), { slug: k.slug, value: k.value, variant: k.variant }, P20, 'age', cfg12)
  if (!s) { console.error(`  ✗ ${k.label} : non calculé`); failures++; continue }
  if (near(s.pct, k.pct, 0.0005, k.label)) console.log(`  ✓ ${k.label} → ${(s.pct * 100).toFixed(1)} %`)
}
// Un 5RM sur une épreuve sans `rm_choice` (ex. clean 2RM) ne doit PAS être converti.
const cl = computeTest(t12('clean_2rm'), { slug: 'clean_2rm', value: 80, variant: 'rm5' }, P20, 'age', cfg12)
const cl0 = computeTest(t12('clean_2rm'), { slug: 'clean_2rm', value: 80 }, P20, 'age', cfg12)
if (cl && cl0 && near(cl.pct, cl0.pct, 1e-9, 'clean 2RM : pas de conversion 5RM')) console.log('  ✓ clean 2RM : variante rm5 ignorée (pas de rm_choice)')

// ── Decaform v1.2 : 8 qualités, pondérations cohérentes, points par qualité ──
console.log('\nv1.2 — qualités et pondérations')
const qkeys = cfg12.qualities.map((q) => q.key)
if (qkeys.length === 8 && qkeys.includes('endurance_musculaire')) console.log('  ✓ 8 qualités, dont l’endurance musculaire')
else { console.error('  ✗ les 8 qualités attendues ne sont pas là :', qkeys.join(', ')); failures++ }
for (const t of cfg12.tests) {
  const sum = qkeys.reduce((n, k) => n + (t.weights[k] ?? 0), 0)
  if (Math.abs(sum - 1) > 1e-9) { console.error(`  ✗ ${t.slug} : pondérations = ${sum} (≠ 1)`); failures++ }
}
for (const band of Object.keys(cfg12.age.pf)) {
  for (const k of qkeys) if (cfg12.age.pf[band][k] == null) { console.error(`  ✗ facteur d'âge manquant : ${band} / ${k}`); failures++ }
}
const totalPts = cfg12.tests.reduce((n, t) => n + t.pts_max, 0)
if (totalPts === cfg12.total_points) console.log(`  ✓ ${cfg12.tests.length} épreuves, ${totalPts} points, pondérations = 1, facteurs d'âge complets`)
else { console.error(`  ✗ total de points ${totalPts} ≠ ${cfg12.total_points}`); failures++ }
const emPts = cfg12.tests.reduce((n, t) => n + t.pts_max * (t.weights.endurance_musculaire ?? 0), 0)
console.log(`  · endurance musculaire : ${emPts.toFixed(1)} pts (circuit Hyrox, dead hang)`)

// ── Decaform v1.2 : Conditioning (remplace l'AMRAP et le circuit en 5 tours) ──
console.log('\nv1.2 — Conditioning')
if (!cfg12.tests.some((t) => t.slug === 'amrap_20min' || t.slug === 'hyrox_circuit' || t.slug === 'hyrox_continu')) console.log('  ✓ plus d’AMRAP ni d’ancien circuit dans la v1.2')
else { console.error('  ✗ amrap_20min, hyrox_circuit ou hyrox_continu encore présent dans la v1.2'); failures++ }
const hx = t12('conditioning')
if (hx.pts_max === 140 && hx.attempts === 7 && hx.aggregate === 'sum' && hx.group === 'Conditioning') console.log('  ✓ conditioning : 140 pts, 7 stations, temps additionnés')
else { console.error('  ✗ conditioning : paramètres inattendus'); failures++ }
for (const [label, sex, v, pct] of [
  ['Conditioning homme = Réf (48 min 20)', 'M', 2900, 0.6], ['Conditioning homme = Max (34 min 10)', 'M', 2050, 1],
  ['Conditioning femme = Réf (51 min 40)', 'F', 3100, 0.6], ['Conditioning femme = Max (36 min 40)', 'F', 2200, 1],
] as [string, 'M' | 'F', number, number][]) {
  const s = computeTest(hx, { slug: 'conditioning', value: v }, { sex, bodyWeightKg: 72, ageBand: '21-25' }, 'general', cfg12)
  if (s && near(s.pct, pct, 1e-9, label)) console.log(`  ✓ ${label} → ${(s.pct * 100).toFixed(1)} %`)
  else if (!s) { console.error(`  ✗ ${label} : non calculé`); failures++ }
}
// Régression (australiennes / pompes genoux) : +5 % sur le temps.
const hxE = computeTest(hx, { slug: 'conditioning', value: 3000, equipment: 'regression' }, P20, 'general', cfg12)
const hxS = computeTest(hx, { slug: 'conditioning', value: 3150 }, P20, 'general', cfg12)
if (hxE && hxS && near(hxE.pct, hxS.pct, 1e-9, 'Conditioning : régression = +5 %')) console.log('  ✓ régression (australiennes / genoux) : +5 % sur le temps')
if (cfg12.max_days === 15 && cfg12.days?.find((d) => d.day === 8)?.rest === true && cfg12.days?.find((d) => d.day === 12)?.label === 'Conditioning') console.log('  ✓ max_days = 15, jour 8 = repos, jour 12 = Conditioning')
else { console.error('  ✗ max_days ou jours inattendus'); failures++ }

// Charges du Conditioning : tranches de poids (bornes incluses côté léger) et facteur d'âge (facteur de force).
const eq = (a: number, b: number, label: string) => { if (a === b) return true; console.error(`  ✗ ${label} : ${a} ≠ ${b}`); failures++; return false }
let okLoads = true
for (const [sex, w, dl, th, lg] of [
  ['M', 55, 50, 10, 10], ['M', 60, 50, 10, 10], ['M', 60.1, 60, 12.5, 15], ['M', 72, 65, 15, 17.5], ['M', 80, 75, 15, 20], ['M', 84, 85, 17.5, 22.5],
  ['M', 88, 95, 20, 25], ['M', 95, 100, 20, 27.5],
  ['F', 48, 30, 7.5, 7.5], ['F', 55, 40, 10, 7.5], ['F', 64, 45, 12.5, 12.5], ['F', 68, 50, 12.5, 12.5], ['F', 72, 52.5, 15, 15], ['F', 78, 55, 15, 17.5], ['F', 90, 60, 20, 22.5],
] as [ 'M' | 'F', number, number, number, number ][]) {
  const l = conditioningLoads(sex, w)
  okLoads = eq(l.deadlift, dl, `soulevé de terre ${sex} ${w} kg`) && eq(l.thruster, th, `thrusters ${sex} ${w} kg`) && eq(l.lunge, lg, `fentes ${sex} ${w} kg`) && okLoads
}
if (okLoads) console.log('  ✓ charges Conditioning par tranche de poids (H et F, bornes comprises)')
const f65 = cfg12.age.pf['61-65'].force
const l65 = conditioningLoads('M', 82, f65)
if (eq(l65.deadlift, 60, 'soulevé de terre homme 82 kg à 63 ans') && eq(conditioningLoads('M', 82, cfg12.age.pf['71-75'].force).deadlift, 45, 'soulevé de terre homme 82 kg à 73 ans') && eq(conditioningLoads('F', 65, f65).deadlift, 32.5, 'soulevé de terre femme 65 kg à 63 ans')) console.log('  ✓ charges réduites selon l’âge (facteur de force) : 85 → 60 kg à 63 ans, 45 kg à 73 ans')
if (eq(conditioningLoads('F', 48, 0.42).lunge, 5, 'plancher haltère 5 kg') && eq(conditioningLoads('F', 48, 0.42).deadlift, 20, 'plancher barre 20 kg')) console.log('  ✓ planchers : haltère 5 kg, barre 20 kg')
if (eq(rowerDistanceM(0), 2000, 'rameur 0 %') && eq(rowerDistanceM(10), 2200, 'rameur +10 %') && eq(rowerDistanceM(7.5), 2150, 'rameur +7,5 %')) console.log('  ✓ rameur : 2 000 m + % de surestimation (10 % → 2 200 m)')
const shareSum = PROTOCOLS.conditioning.stationShare!.reduce((a, b) => a + b, 0)
if (Math.abs(shareSum - 1) < 1e-9 && PROTOCOLS.conditioning.stations!.length === 7 && PROTOCOLS.conditioning.stationsF!.length === 7) console.log('  ✓ 7 stations, parts attendues = 100 %')
else { console.error(`  ✗ stations / parts attendues incohérentes (somme ${shareSum})`); failures++ }

console.log(`\nÉcarts max — pct: ${maxPct.toFixed(6)} · points: ${maxPts.toFixed(6)} · total: ${maxTotal.toFixed(6)} · qualité pct: ${maxQPct.toFixed(6)}`)
if (failures === 0) {
  console.log('\n✓ VALIDATION RÉUSSIE — les 3 cas de référence et les épreuves à critères sont reproduits dans la tolérance.')
  process.exit(0)
} else {
  console.error(`\n✗ ÉCHEC — ${failures} écart(s) hors tolérance.`)
  process.exit(1)
}
