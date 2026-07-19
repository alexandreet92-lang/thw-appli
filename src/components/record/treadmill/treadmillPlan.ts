// Aplatit les blocs d'une séance course TAPIS planifiée (planned_sessions.blocks,
// sport='run', validation_data.runningSub='treadmill') en une timeline linéaire
// d'intervalles. Pur, testable. Aucune valeur fabriquée : si `blocks` est vide ou
// illisible → null (séance libre).
//
// Modèle de bloc (rappel, cf. planning/mobile/blocks.ts) :
//  - effortUnit==='kmh'   → `value` = vitesse tapis en km/h, `inclinePct` = pente %
//  - effortUnit==='pace'  → `value` = allure "m:ss"/km
//  - effortUnit==='pctvma'→ `value` = "NN%"  (traité comme non chiffré ici)
//  - durée : durationMin (single) ou reps × (effortMin + recoveryMin) (interval)

export type TreadKind = 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'block'

/** Sous-ensemble utile d'un bloc tel que persisté en JSONB. */
export interface PlannedRunBlock {
  mode?: string
  type?: string
  durationMin?: number
  zone?: number
  value?: string
  effortUnit?: string          // 'kmh' | 'pace' | 'pctvma' | 'zone' | 'watts'
  inclinePct?: number
  reps?: number
  effortMin?: number
  recoveryMin?: number
  recoveryZone?: number
  recoveryValue?: string
  recoveryStyle?: string       // 'trot' | 'marche'
  label?: string
  distanceM?: number
}

export interface TreadStep {
  name: string
  kind: TreadKind
  durationS: number
  targetKmh: number | null     // vitesse cible tapis (km/h) si connue
  targetPaceSecPerKm: number | null  // allure cible (s/km) si connue
  inclinePct: number
  zone: number
  rep?: number                 // 1-based dans un bloc interval
  of?: number
  t0: number
  t1: number
}

export interface TreadmillPlan {
  title: string
  steps: TreadStep[]
  totalS: number
  totalDistanceM: number
}

const NAME_BY_TYPE: Record<string, string> = {
  warmup: 'Échauffement', effort: 'Effort', recovery: 'Récupération', cooldown: 'Retour au calme',
}
const KIND_BY_TYPE: Record<string, TreadKind> = {
  warmup: 'warmup', effort: 'effort', recovery: 'recovery', cooldown: 'cooldown', circuit_header: 'block',
}

// ── Conversions allure ↔ vitesse ────────────────────────────────
/** "m:ss" (allure /km) → secondes/km. Renvoie null si illisible. */
export function paceStrToSec(v: string | undefined | null): number | null {
  if (!v) return null
  const m = v.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  return sec > 0 ? sec : null
}
/** secondes/km → km/h. */
export function paceSecToKmh(secPerKm: number): number {
  return secPerKm > 0 ? 3600 / secPerKm : 0
}
/** km/h → secondes/km. */
export function kmhToPaceSec(kmh: number): number {
  return kmh > 0 ? 3600 / kmh : 0
}
/** secondes/km → "m:ss". */
export function fmtPaceSec(secPerKm: number | null): string {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm <= 0) return '—'
  const s = Math.round(secPerKm)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Résout la cible (km/h + allure) d'un bloc selon son effortUnit. */
function resolveTarget(value: string | undefined, unit: string | undefined): { kmh: number | null; paceSec: number | null } {
  const n = Number((value ?? '').trim())
  if (unit === 'kmh') {
    if (isFinite(n) && n > 0) return { kmh: n, paceSec: kmhToPaceSec(n) }
    return { kmh: null, paceSec: null }
  }
  if (unit === 'pace') {
    const p = paceStrToSec(value)
    return p != null ? { kmh: paceSecToKmh(p), paceSec: p } : { kmh: null, paceSec: null }
  }
  // pctvma / zone / watts / absent : on tente un nombre = km/h (repli tapis courant)
  if (isFinite(n) && n > 0 && n < 40) return { kmh: n, paceSec: kmhToPaceSec(n) }
  return { kmh: null, paceSec: null }
}

function nameOf(b: PlannedRunBlock): string {
  const l = (b.label ?? '').trim()
  if (l) return l
  return NAME_BY_TYPE[b.type ?? ''] ?? 'Bloc'
}

export function buildTreadmillPlan(blocks: PlannedRunBlock[] | null | undefined, title: string): TreadmillPlan | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  const flat: Omit<TreadStep, 't0' | 't1'>[] = []

  for (const b of blocks) {
    const kind = KIND_BY_TYPE[b.type ?? ''] ?? 'block'
    const incline = b.inclinePct ?? 0
    const zone = b.zone ?? 1
    const tgt = resolveTarget(b.value, b.effortUnit)

    if (b.mode === 'interval' && b.reps && b.effortMin) {
      const recTgt = resolveTarget(b.recoveryValue, b.effortUnit)
      for (let r = 0; r < b.reps; r++) {
        flat.push({
          name: nameOf(b), kind: 'effort', durationS: Math.round(b.effortMin * 60),
          targetKmh: tgt.kmh, targetPaceSecPerKm: tgt.paceSec, inclinePct: incline, zone,
          rep: r + 1, of: b.reps,
        })
        if (b.recoveryMin && b.recoveryMin > 0) {
          flat.push({
            name: b.recoveryStyle === 'marche' ? 'Marche' : 'Récupération', kind: 'recovery',
            durationS: Math.round(b.recoveryMin * 60),
            targetKmh: recTgt.kmh, targetPaceSecPerKm: recTgt.paceSec,
            inclinePct: 0, zone: b.recoveryZone ?? 1,
          })
        }
      }
    } else {
      const durS = Math.round((b.durationMin ?? 0) * 60)
      if (durS <= 0) continue
      flat.push({
        name: nameOf(b), kind, durationS: durS,
        targetKmh: tgt.kmh, targetPaceSecPerKm: tgt.paceSec, inclinePct: incline, zone,
      })
    }
  }

  if (flat.length === 0) return null
  let t = 0
  let dist = 0
  const steps: TreadStep[] = flat.map(fb => {
    const t0 = t; t += fb.durationS
    if (fb.targetKmh && fb.targetKmh > 0) dist += (fb.targetKmh / 3.6) * fb.durationS
    return { ...fb, t0, t1: t }
  })
  return { title, steps, totalS: t, totalDistanceM: Math.round(dist) }
}

// ── Couleur de fond du mode live selon la ZONE d'intensité ──────
// Vert = Z1-Z2, Jaune = Z3-Z4, Rouge = Z5+. Tokens sanctionnés --zone-*.
export function zoneBg(zone: number): string {
  if (zone <= 2) return 'var(--zone-2)'   // vert
  if (zone <= 4) return 'var(--zone-3)'   // jaune
  return 'var(--zone-5)'                   // rouge
}
/** Encre lisible sur le fond de zone (jaune/vert clairs → encre sombre ; rouge → blanc). */
export function zoneInk(zone: number): string {
  return zone >= 5 ? '#ffffff' : '#0A0C10'
}
export function zoneLabel(zone: number): string {
  if (zone <= 2) return `Zone ${Math.max(1, zone)}`
  if (zone <= 4) return `Zone ${zone}`
  return `Zone ${zone}`
}
