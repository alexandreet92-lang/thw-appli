// ══════════════════════════════════════════════════════════════
// MOTEUR DE CALCUL DES TESTS — logique précise par test, tous sports.
//
// Objectif : à partir des SEULES valeurs brutes que l'athlète mesure, calculer
// automatiquement les valeurs dérivées (PMA, FTP, CSS, VO2max, splits, ratios…).
//
// Deux règles transverses (demande produit) :
//   1. Toute valeur en watts est TOUJOURS doublée d'un W/kg (poids de l'athlète).
//      → un Derived avec { unit:'W', wkg:true } affiche « 155 W · 2.1 W/kg ».
//   2. Toute valeur numérique est arrondie (arrondi standard : .5 → au-dessus).
//
// Les clés de sortie reprennent les clés canoniques attendues par le scoring
// (TEST_BENCHMARKS) et le radar (performance_scores) : ftp_wkg, pma_wkg, vma_kmh…
// ══════════════════════════════════════════════════════════════

import type { FieldDef } from './testTypes'

export interface Derived {
  key: string          // clé canonique (merge dans valeurs, lue par le scoring)
  label: string
  value: number        // valeur numérique arrondie
  unit: string         // 'W', 'W/kg', 'ml/kg/min', 's/100m', '/500m', '/km'…
  wkg?: boolean        // si true : valeur en watts → afficher aussi value/poids en W/kg
  display?: string     // rendu textuel prêt (times mm:ss) ; sinon on formate depuis value+unit
  hidden?: boolean     // clé canonique nécessaire au scoring mais NON affichée (doublon d'un W/kg inline)
}

// ── Helpers numériques ────────────────────────────────────────
export const round = (n: number) => Math.round(n)
export const round1 = (n: number) => Math.round(n * 10) / 10
export const round2 = (n: number) => Math.round(n * 100) / 100

export function num(v: string | undefined): number {
  if (v == null) return 0
  const n = parseFloat(String(v).replace(',', '.'))
  return isFinite(n) ? n : 0
}

// Parse « mm:ss », « h:mm:ss » ou un nombre de secondes → secondes.
export function toSec(v: string | undefined): number {
  if (v == null) return 0
  const s = String(v).trim()
  if (s === '') return 0
  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseFloat(p.replace(',', '.')) || 0)
    return parts.reduce((acc, p) => acc * 60 + p, 0)
  }
  return num(s)
}

// Secondes → « m:ss » (splits, allures) ou « h:mm:ss » si ≥ 1h.
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${m}:${String(ss).padStart(2, '0')}`
}

// Puissance Concept2 depuis une allure /500m : watts = 2.80 / (s_par_metre)^3.
function concept2Watts(secPer500: number): number {
  if (secPer500 <= 0) return 0
  const pace = secPer500 / 500 // s/m
  return 2.8 / Math.pow(pace, 3)
}

// ── Redéfinition des CHAMPS DE SAISIE (uniquement valeurs BRUTES) ─────────────
// Pour les tests où l'ancien formulaire mélangeait des champs dérivés (FTP, W/kg,
// VO2max estimé…) : on ne garde ici que ce que l'athlète mesure réellement.
// Les tests absents de cette table conservent PROTOCOLS[id].fields.
export const RAW_INPUTS: Record<string, FieldDef[]> = {
  // ── Vélo ──
  cp20: [
    { cle: 'puissance_moy', label: 'Puissance moyenne 20 min', unite: 'W', type: 'number', placeholder: 'Ex: 250', required: true },
    { cle: 'fcmax', label: 'FC max atteinte', unite: 'bpm', type: 'number' },
  ],
  'vo2max-cycling': [
    { cle: 'depart_w', label: 'Palier de départ', unite: 'W', type: 'number', placeholder: 'Ex: 80', required: true, helper: 'Puissance du 1er palier (60 / 80 / 100 / 160…)' },
    { cle: 'dernier_palier_w', label: 'Dernier palier validé', unite: 'W', type: 'number', placeholder: 'Ex: 140', required: true, helper: 'Watts du dernier palier tenu 2 min complètes' },
    { cle: 'temps_dernier_palier', label: 'Temps tenu sur le palier non validé', unite: 'mm:ss', type: 'string', placeholder: 'Ex: 1:30', helper: 'Sur le palier suivant (+20 W), avant l’arrêt' },
    { cle: 'fcmax', label: 'FC max atteinte', unite: 'bpm', type: 'number' },
  ],
  'critical-power': [
    { cle: 'puiss_3min', label: 'Puissance moy 3 min', unite: 'W', type: 'number', required: true },
    { cle: 'puiss_12min', label: 'Puissance moy 12 min', unite: 'W', type: 'number', required: true },
  ],
  wingate: [
    { cle: 'ppeak', label: 'Puissance de crête', unite: 'W', type: 'number', required: true },
    { cle: 'pmoy', label: 'Puissance moyenne 30s', unite: 'W', type: 'number' },
    { cle: 'pmin', label: 'Puissance minimale', unite: 'W', type: 'number' },
  ],
  // ── Course ──
  cooper: [
    { cle: 'distance', label: 'Distance parcourue', unite: 'm', type: 'number', placeholder: 'Ex: 2950', required: true },
    { cle: 'fcmax', label: 'FC fin de test', unite: 'bpm', type: 'number' },
  ],
  // ── Natation ──
  css: [
    { cle: 't400', label: 'Temps 400m', unite: 'mm:ss', type: 'string', placeholder: 'Ex: 6:00', required: true },
    { cle: 't200', label: 'Temps 200m', unite: 'mm:ss', type: 'string', placeholder: 'Ex: 2:40', required: true },
  ],
  'vmax-swim': [
    { cle: 't25m', label: 'Meilleur temps 25m', unite: 's', type: 'number', placeholder: 'Ex: 14.2' },
    { cle: 't50m', label: 'Meilleur temps 50m', unite: 's', type: 'number', placeholder: 'Ex: 30.5' },
    { cle: 'nage', label: 'Nage utilisée', unite: null, type: 'string', placeholder: 'Crawl / Brasse / Dos / Papillon' },
  ],
  // ── Aviron ──
  'power-row': [
    { cle: 'ppeak', label: 'Puissance de crête', unite: 'W', type: 'number', required: true },
    { cle: 'spm_peak', label: 'Cadence au pic', unite: 'spm', type: 'number' },
  ],
  '2000m-row': [
    { cle: 'temps_total', label: 'Temps total', unite: 'mm:ss', type: 'string', placeholder: 'Ex: 6:52', required: true },
    { cle: 'spm_moy', label: 'Cadence moyenne', unite: 'spm', type: 'number' },
    { cle: 'fcmax', label: 'FC maximale', unite: 'bpm', type: 'number' },
  ],
  '30min-row': [
    { cle: 'distance', label: 'Distance totale', unite: 'm', type: 'number', placeholder: 'Ex: 8350', required: true },
    { cle: 'fcmax', label: 'FC maximale', unite: 'bpm', type: 'number' },
  ],
  'vo2max-row': [
    { cle: 'pma', label: 'PMA (puissance max)', unite: 'W', type: 'number', required: true },
    { cle: 'fcmax', label: 'FC maximale', unite: 'bpm', type: 'number' },
  ],
}

// ── Le calcul lui-même ────────────────────────────────────────
// weightKg : poids de l'athlète AU MOMENT du test (éditable dans l'UI).
export function computeDerived(testId: string, raw: Record<string, string>, weightKg: number, gender: 'M' | 'F'): Derived[] {
  const W = (key: string, label: string, watts: number): Derived => ({ key, label, value: round(watts), unit: 'W', wkg: true })
  const out: Derived[] = []

  switch (testId) {
    // ── VÉLO ──────────────────────────────────────────────
    case 'cp20': {
      const pm = num(raw.puissance_moy)
      if (pm <= 0) return []
      const ftp = pm * 0.95
      out.push(W('ftp', 'FTP', ftp))
      if (weightKg > 0) out.push({ key: 'ftp_wkg', label: 'FTP', value: round2(ftp / weightKg), unit: 'W/kg', hidden: true })
      return out
    }
    case 'vo2max-cycling': { // Ramp test
      const depart = num(raw.depart_w)
      const dernier = num(raw.dernier_palier_w)
      const tHeld = toSec(raw.temps_dernier_palier)
      if (dernier <= 0) return []
      // PMA = dernier validé + (temps tenu / 120 s) × 20 W (palier de +20 W / 2 min).
      const frac = Math.min(1, tHeld / 120)
      const pma = dernier + frac * 20
      out.push(W('pma', 'PMA', pma))
      if (weightKg > 0) out.push({ key: 'pma_wkg', label: 'PMA', value: round2(pma / weightKg), unit: 'W/kg', hidden: true })
      const ftp = pma * 0.76
      out.push(W('ftp', 'FTP estimée', ftp))
      if (weightKg > 0) out.push({ key: 'ftp_wkg', label: 'FTP', value: round2(ftp / weightKg), unit: 'W/kg', hidden: true })
      if (weightKg > 0) out.push({ key: 'vo2max_estime', label: 'VO2max estimé', value: round(pma * 10.8 / weightKg + 7), unit: 'ml/kg/min' })
      if (depart > 0) out.push({ key: 'palier_depart', label: 'Palier de départ', value: round(depart), unit: 'W', wkg: true })
      return out
    }
    case 'critical-power': {
      const p3 = num(raw.puiss_3min), p12 = num(raw.puiss_12min)
      if (p3 <= 0 || p12 <= 0) return []
      const cp = (p12 * 12 - p3 * 3) / 9
      out.push(W('cp', 'Critical Power', cp))
      if (weightKg > 0) out.push({ key: 'cp_wkg', label: 'CP', value: round2(cp / weightKg), unit: 'W/kg', hidden: true })
      const wprime = (p3 - cp) * 3 * 60 // joules
      out.push({ key: 'wprime', label: "W' (réserve anaérobie)", value: round1(wprime / 1000), unit: 'kJ' })
      return out
    }
    case 'wingate': {
      const ppeak = num(raw.ppeak), pmin = num(raw.pmin)
      if (ppeak <= 0) return []
      if (weightKg > 0) out.push({ key: 'ppeak_kg', label: 'Puissance de crête', value: round2(ppeak / weightKg), unit: 'W/kg' })
      if (pmin > 0) out.push({ key: 'if_fatigue', label: 'Indice de fatigue', value: round((ppeak - pmin) / ppeak * 100), unit: '%' })
      return out
    }
    // ── COURSE ────────────────────────────────────────────
    case 'cooper': {
      const d = num(raw.distance)
      if (d <= 0) return []
      const vo2 = (d - 504.9) / 44.73
      out.push({ key: 'vo2max_estime', label: 'VO2max estimé', value: round1(vo2), unit: 'ml/kg/min' })
      // VMA estimée depuis le VO2max (VMA ≈ VO2max / 3.5, en km/h).
      const vmaEst = vo2 / 3.5
      if (vmaEst > 0) out.push({ key: 'vma_kmh', label: 'VMA estimée', value: round1(vmaEst), unit: 'km/h' })
      return out
    }
    case 'vma': {
      const vma = num(raw.vma)
      if (vma <= 0) return []
      out.push({ key: 'vma_kmh', label: 'VMA', value: round1(vma), unit: 'km/h' })
      // Allure à VMA (min/km) = 60 / VMA.
      out.push({ key: 'allure_vma', label: 'Allure à VMA', value: round(3600 / vma), unit: '/km', display: fmtTime(3600 / vma) })
      return out
    }
    // ── NATATION ──────────────────────────────────────────
    case 'css': {
      const t400 = toSec(raw.t400), t200 = toSec(raw.t200)
      if (t400 <= 0 || t200 <= 0 || t400 <= t200) return []
      const cssMs = (400 - 200) / (t400 - t200) // m/s
      const cssPer100 = 100 / cssMs
      out.push({ key: 'css_s_100m', label: 'CSS (allure seuil)', value: round(cssPer100), unit: '/100m', display: fmtTime(cssPer100) })
      out.push({ key: 'css_ms', label: 'CSS', value: round2(cssMs), unit: 'm/s' })
      return out
    }
    case 'vmax-swim': {
      const t25 = num(raw.t25m), t50 = num(raw.t50m)
      const v = t25 > 0 ? 25 / t25 : t50 > 0 ? 50 / t50 : 0
      if (v <= 0) return []
      out.push({ key: 'vmax_ms', label: 'Vitesse max', value: round2(v), unit: 'm/s' })
      out.push({ key: 'vmax_100', label: 'Allure sur 100m', value: round(100 / v), unit: '/100m', display: fmtTime(100 / v) })
      return out
    }
    // ── AVIRON ────────────────────────────────────────────
    case 'power-row': {
      const ppeak = num(raw.ppeak)
      if (ppeak <= 0) return []
      if (weightKg > 0) out.push({ key: 'ppeak_kg', label: 'Puissance de crête', value: round2(ppeak / weightKg), unit: 'W/kg' })
      return out
    }
    case '2000m-row': {
      const tt = toSec(raw.temps_total)
      if (tt <= 0) return []
      const split = tt / 4 // /500m
      out.push({ key: 'split_moy', label: 'Split moyen', value: round(split), unit: '/500m', display: fmtTime(split) })
      out.push(W('puissance_moy', 'Puissance moyenne', concept2Watts(split)))
      return out
    }
    case '30min-row': {
      const d = num(raw.distance)
      if (d <= 0) return []
      const split = (30 * 60) / (d / 500)
      out.push({ key: 'split_moy', label: 'Split moyen', value: round(split), unit: '/500m', display: fmtTime(split) })
      out.push(W('puissance_moy', 'Puissance moyenne (≈ FTP aviron)', concept2Watts(split)))
      return out
    }
    case 'vo2max-row': {
      const pma = num(raw.pma)
      if (pma <= 0) return []
      if (weightKg > 0) out.push({ key: 'pma_wkg', label: 'PMA', value: round2(pma / weightKg), unit: 'W/kg' })
      return out
    }
    // ── HYROX Force : ratios charge / poids de corps ──────
    case 'hyrox-force': {
      const bw = num(raw.body_weight) || weightKg
      if (bw <= 0) return []
      const dl = num(raw.dl_charge), sq = num(raw.sq_charge), b1 = num(raw.bench_1rm)
      if (dl > 0) out.push({ key: 'dl_ratio', label: 'Deadlift / PDC', value: round2(dl / bw), unit: '×' })
      if (sq > 0) out.push({ key: 'sq_ratio', label: 'Squat / PDC', value: round2(sq / bw), unit: '×' })
      if (b1 > 0) out.push({ key: 'bench_1rm_ratio', label: 'Bench / PDC', value: round2(b1 / bw), unit: '×' })
      return out
    }
    default:
      return []
  }
}

// Aplati les Derived en Record<string,string> pour merge dans `valeurs`
// (le scoring et le radar lisent ces clés).
export function derivedToVals(derived: Derived[]): Record<string, string> {
  const o: Record<string, string> = {}
  for (const d of derived) o[d.key] = String(d.value)
  return o
}
