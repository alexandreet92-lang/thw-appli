// Génère les `streams` d'une séance course TAPIS à partir de ses intervalles
// (durée + vitesse km/h + pente %). Partagé par la saisie manuelle ET par la
// séance lancée depuis « Démarrer ». Aucune donnée fabriquée : seuls les champs
// réellement fournis (FC, température) produisent un stream.
//
// Profil altimétrique : MONOTONE MONTANT (jamais de descente sur tapis) — soit
// à plat (pente 0), soit ça grimpe. altitude(t) = cumul de distance×pente/100.
// La vitesse est constante par bloc ; on expose aussi la vitesse équivalente à
// plat (pente incluse, éq. ACSM) pour la lecture d'effort.

export interface TreadInterval {
  durationS: number
  speedKmh: number       // vitesse tapis constante sur le bloc
  inclinePct: number     // pente % (≥ 0)
  hr?: number | null     // FC moyenne du bloc si renseignée
  tempC?: number | null  // température si renseignée
}

export interface TreadStreams {
  time: number[]
  distance: number[]
  altitude: number[]
  velocity: number[]          // m/s
  velocityEqKmh: number[]     // km/h équivalent plat (pente incluse)
  heartrate?: number[]
  temp?: number[]
}

/** Vitesse équivalente plat (km/h) — éq. ACSM v_eq = v·(1 + 4,5·pente). */
export function kmhEq(kmh: number, inclinePct: number): number {
  return kmh * (1 + 4.5 * Math.max(0, inclinePct || 0) / 100)
}

/**
 * Échantillonne les intervalles en séries uniformes dans le temps (x ∝ temps).
 * Nombre de points borné (≤ ~600) pour un JSON léger. altitude cumulée, montante.
 */
export function buildTreadmillStreams(intervals: TreadInterval[]): TreadStreams | null {
  const valid = intervals.filter(iv => iv.durationS > 0)
  if (valid.length === 0) return null

  const totalS = valid.reduce((s, iv) => s + iv.durationS, 0)
  if (totalS <= 0) return null

  const anyHr = valid.some(iv => iv.hr != null && iv.hr > 0)
  const anyTemp = valid.some(iv => iv.tempC != null)

  // Pas d'échantillonnage : ~1 pt/s, borné à 600 points.
  const dt = Math.max(1, Math.ceil(totalS / 600))

  // Bornes cumulées de chaque bloc + altitude de départ de bloc.
  const bounds: { t0: number; t1: number; iv: TreadInterval; alt0: number }[] = []
  let tAcc = 0, altAcc = 0
  for (const iv of valid) {
    const t0 = tAcc
    tAcc += iv.durationS
    const distBlock = (iv.speedKmh / 3.6) * iv.durationS
    const gain = distBlock * Math.max(0, iv.inclinePct || 0) / 100
    bounds.push({ t0, t1: tAcc, iv, alt0: altAcc })
    altAcc += gain
  }

  const time: number[] = []
  const distance: number[] = []
  const altitude: number[] = []
  const velocity: number[] = []
  const velocityEqKmh: number[] = []
  const heartrate: number[] = []
  const temp: number[] = []

  let distAcc = 0
  let prevT = 0
  for (let ts = 0; ts <= totalS; ts += dt) {
    const seg = bounds.find(b => ts < b.t1) ?? bounds[bounds.length - 1]
    const { iv, t0, alt0 } = seg
    const vMs = iv.speedKmh / 3.6
    // distance cumulée (intègre la vitesse depuis le dernier point)
    distAcc += vMs * (ts - prevT)
    prevT = ts
    // altitude : alt de début de bloc + montée linéaire depuis t0
    const gainSoFar = vMs * (ts - t0) * Math.max(0, iv.inclinePct || 0) / 100
    time.push(ts)
    distance.push(Math.round(distAcc))
    altitude.push(Math.round((alt0 + gainSoFar) * 10) / 10)
    velocity.push(Math.round(vMs * 100) / 100)
    velocityEqKmh.push(Math.round(kmhEq(iv.speedKmh, iv.inclinePct) * 10) / 10)
    if (anyHr) heartrate.push(iv.hr && iv.hr > 0 ? iv.hr : 0)
    if (anyTemp) temp.push(iv.tempC != null ? iv.tempC : 0)
  }

  const out: TreadStreams = { time, distance, altitude, velocity, velocityEqKmh }
  if (anyHr) out.heartrate = heartrate
  if (anyTemp) out.temp = temp
  return out
}

/** Résumé agrégé d'une liste d'intervalles (pour l'enregistrement). */
export function summarizeIntervals(intervals: TreadInterval[]): {
  durationS: number; distanceM: number; elevationM: number; avgSpeedMs: number; avgHr: number | null
} {
  const valid = intervals.filter(iv => iv.durationS > 0)
  let durationS = 0, distanceM = 0, elevationM = 0, hrSum = 0, hrDur = 0
  for (const iv of valid) {
    const d = (iv.speedKmh / 3.6) * iv.durationS
    durationS += iv.durationS
    distanceM += d
    elevationM += d * Math.max(0, iv.inclinePct || 0) / 100
    if (iv.hr != null && iv.hr > 0) { hrSum += iv.hr * iv.durationS; hrDur += iv.durationS }
  }
  return {
    durationS,
    distanceM: Math.round(distanceM),
    elevationM: Math.round(elevationM),
    avgSpeedMs: durationS > 0 ? distanceM / durationS : 0,
    avgHr: hrDur > 0 ? Math.round(hrSum / hrDur) : null,
  }
}
