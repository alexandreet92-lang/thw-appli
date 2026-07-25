'use client'
// ══════════════════════════════════════════════════════════════════
// Résumé LIVE des blocs d'endurance (builder Planning) : durée totale +
// intensité moyenne pondérée par la durée (vélo/elliptique → watts ;
// course → allure ; natation → /100m ; aviron → /500m). Séance TAPIS :
// km estimés, D+ (m), allure moyenne et VAP (allure ajustée pente,
// éq. ACSM) via summarizeIntervals / kmhEq (treadmillProfile — réutilisé,
// zéro logique dupliquée). Se met à jour dès qu'il y a des blocs,
// qu'ils soient saisis à la main OU générés par l'IA.
// ══════════════════════════════════════════════════════════════════
import { useMemo } from 'react'
import type { SportType, RunningSub } from '@/app/planning/page'
import { summarizeIntervals, kmhEq, type TreadInterval } from '@/components/record/treadmill/treadmillProfile'
import { toBars, totalMin, totalDistance, type MBlock } from './blocks'
import { paceToSec, secToPace, fmtDur } from './editorial'
import { Banner } from './ui'
import { useI18n } from '@/lib/i18n'

// Vitesse de récup tapis si non chiffrée (style trot / marche).
const RECUP_KMH: Record<string, number> = { trot: 8, marche: 5 }

/** Blocs tapis (effortUnit kmh) → intervalles {durée s, vitesse km/h, pente %}. */
export function blocksToTreadIntervals(blocks: MBlock[]): TreadInterval[] {
  const out: TreadInterval[] = []
  for (const b of blocks) {
    const kmh = parseFloat(b.value || '0') || 0
    const incline = Math.max(0, b.inclinePct ?? 0)
    if (b.mode === 'interval' && b.reps) {
      const recKmh = parseFloat(b.recoveryValue || '') || RECUP_KMH[b.recoveryStyle ?? 'trot'] || 8
      for (let r = 0; r < b.reps; r++) {
        out.push({ durationS: Math.round((b.effortMin ?? 0) * 60), speedKmh: kmh, inclinePct: incline })
        if ((b.recoveryMin ?? 0) > 0) out.push({ durationS: Math.round((b.recoveryMin ?? 0) * 60), speedKmh: recKmh, inclinePct: 0 })
      }
    } else {
      out.push({ durationS: Math.round((b.durationMin || 0) * 60), speedKmh: kmh, inclinePct: incline })
    }
  }
  return out.filter(iv => iv.durationS > 0 && iv.speedKmh > 0)
}

export function EnduranceLiveSummary({ sport, runningSub, blocks }: {
  sport: SportType; runningSub?: RunningSub; blocks: MBlock[]
}) {
  const { t: tr } = useI18n()
  const cells = useMemo(() => {
    if (blocks.length === 0) return null
    const isTreadmill = sport === 'run' && runningSub === 'treadmill'

    if (isTreadmill) {
      const ivs = blocksToTreadIntervals(blocks)
      if (ivs.length === 0) return null
      const s = summarizeIntervals(ivs)
      if (s.durationS <= 0) return null
      const km = s.distanceM / 1000
      const paceSec = km > 0 ? s.durationS / km : 0
      // VAP : vitesse équivalente plat (pente incluse) pondérée par la durée.
      let eqNum = 0
      for (const iv of ivs) eqNum += kmhEq(iv.speedKmh, iv.inclinePct) * iv.durationS
      const eqKmh = eqNum / s.durationS
      const vapSec = eqKmh > 0 ? 3600 / eqKmh : 0
      return [
        { label: tr('planning.duration'), value: fmtDur(s.durationS / 60) },
        { label: tr('planning.estKm'), value: km > 0 ? `${km.toFixed(2).replace('.', ',')} km` : '—' },
        { label: 'D+', value: `${s.elevationM} m` },
        { label: tr('planning.avgPace'), value: paceSec > 0 ? `${secToPace(paceSec)}/km` : '—' },
        { label: 'VAP', value: vapSec > 0 ? `${secToPace(vapSec)}/km` : '—' },
      ]
    }

    const min = totalMin(blocks)
    if (min <= 0) return null
    const distM = totalDistance(blocks)
    const isPower = sport === 'bike' || sport === 'elliptique'
    // Intensité moyenne pondérée par la durée de chaque barre (effort + récup chiffrées).
    let num = 0, den = 0
    for (const bar of toBars(blocks)) {
      if (!bar.min || bar.min <= 0) continue
      if (isPower) {
        const w = parseFloat(bar.value ?? '')
        if (isFinite(w) && w > 0) { num += w * bar.min; den += bar.min }
      } else {
        const p = paceToSec(bar.value ?? '')
        if (!isNaN(p) && p > 0) { num += p * bar.min; den += bar.min }
      }
    }
    const out: { label: string; value: string }[] = [{ label: tr('planning.duration'), value: fmtDur(min) }]
    if (distM > 0) out.push({
      label: tr('planning.distance'),
      value: sport === 'swim' ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(2).replace('.', ',')} km`,
    })
    if (isPower) {
      out.push({ label: tr('planning.avgIntensity'), value: den > 0 ? `${Math.round(num / den)} W` : '—' })
    } else {
      const unit = sport === 'swim' ? '/100m' : sport === 'rowing' ? '/500m' : '/km'
      let v = den > 0 ? `${secToPace(num / den)}${unit}` : '—'
      // Course sans allure chiffrée mais distance connue → allure dérivée durée/distance.
      if (den === 0 && sport === 'run' && distM > 0) v = `${secToPace((min * 60) / (distM / 1000))}/km`
      out.push({ label: sport === 'run' ? tr('planning.avgPace') : tr('planning.avgIntensity'), value: v })
    }
    return out
  }, [blocks, sport, runningSub, tr])

  if (!cells) return null
  return <div style={{ marginTop: 14 }}><Banner cells={cells} /></div>
}
