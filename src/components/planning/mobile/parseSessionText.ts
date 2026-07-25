// ══════════════════════════════════════════════════════════════════
// Parseur CLIENT (zéro IA, temps réel) de la description libre d'une
// séance d'endurance → pseudo-blocs MBlock, pour alimenter le résumé
// live (EnduranceLiveSummary) PENDANT la frappe, avant « Générer ».
// Tolérant : tout segment non reconnu est ignoré, jamais d'erreur.
// Reconnaît : « 10' échauffement @5:20/km », « 6x600m @3:45 récup 1'30 »,
// « 8x400m à 3:30 », « 2km à 4:00/km », « 30' Z2 », « 12 km/h », « 250w »,
// « pente 5% », « 1h30 »…
// ══════════════════════════════════════════════════════════════════
import type { SportType, RunningSub } from '@/app/planning/page'
import type { MBlock } from './blocks'

let seq = 0
const uid = () => `pt_${++seq}`

/** « 5:20 », « 5'20 », « 5' », « 1h30 », « 90s », « 1min30 » → secondes. */
function timeToSec(raw: string): number {
  const s = raw.trim().toLowerCase().replace(',', '.')
  let m = s.match(/^(\d{1,2})\s*h\s*(\d{1,2})?$/)
  if (m) return (+m[1]) * 3600 + (+(m[2] ?? 0)) * 60
  m = s.match(/^(\d{1,3})\s*(?:[:'′]|min)\s*(\d{1,2})?["″]?$/)
  if (m) return (+m[1]) * 60 + (+(m[2] ?? 0))
  m = s.match(/^(\d{1,4})\s*(?:s|sec|["″])$/)
  if (m) return +m[1]
  m = s.match(/^(\d{1,3})$/)
  if (m) return (+m[1]) * 60   // nombre nu dans un contexte temps → minutes
  return 0
}

const TIME_TOKEN = String.raw`(?:\d{1,2}\s*h\s*\d{0,2}|\d{1,3}\s*(?:[:'′]|min)\s*\d{0,2}["″]?|\d{1,4}\s*(?:s|sec|["″]))`

export function parseSessionText(text: string, sport: SportType, runningSub?: RunningSub): MBlock[] {
  const out: MBlock[] = []
  if (!text.trim()) return out
  const isTreadmill = sport === 'run' && runningSub === 'treadmill'
  // Segments : lignes, virgules, « puis », points-virgules.
  const segments = text.split(/\n|,|;|\bpuis\b/i).map(s => s.trim()).filter(Boolean)

  for (const seg of segments) {
    const low = seg.toLowerCase()

    // ── Extractions communes ──
    const paceM = low.match(/(?:@|à|a)\s*(\d{1,2})\s*[:'′h]\s*(\d{2})\s*(?:\/?\s*km)?/)     // allure /km
    const kmhM  = low.match(/(\d{1,2}(?:[.,]\d)?)\s*km\/?h/)
    const wattsM = low.match(/(\d{2,4})\s*w(?:atts)?\b/)
    const inclM  = low.match(/(?:pente\s*)?(\d{1,2}(?:[.,]\d)?)\s*%/)
    const zoneM  = low.match(/\bz\s*([1-6])\b/)
    const recM = low.match(new RegExp(String.raw`(?:r[ée]cup(?:[ée]ration)?\S*|repos)\s*:?\s*(` + TIME_TOKEN + String.raw`|\d{1,2}\s*(?:'|min)?)`))
    const recoveryMin = recM ? timeToSec(recM[1]) / 60 : 0

    const paceSec = paceM ? (+paceM[1]) * 60 + (+paceM[2]) : 0
    const kmh = kmhM ? parseFloat(kmhM[1].replace(',', '.')) : (paceSec > 0 ? 3600 / paceSec : 0)
    const incline = inclM ? parseFloat(inclM[1].replace(',', '.')) : 0

    // Valeur/unité d'effort selon le sport.
    const effort = (): Pick<MBlock, 'value' | 'effortUnit' | 'zone' | 'inclinePct'> => {
      if (sport === 'bike' && wattsM) return { value: wattsM[1], effortUnit: 'watts', zone: zoneM ? +zoneM[1] : 0 }
      if (isTreadmill && kmh > 0) return { value: String(Math.round(kmh * 10) / 10), effortUnit: 'kmh', zone: zoneM ? +zoneM[1] : 0, inclinePct: incline || undefined }
      if (paceSec > 0) return { value: `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, '0')}`, effortUnit: 'pace', zone: zoneM ? +zoneM[1] : 0 }
      if (kmhM) return { value: kmhM[1].replace(',', '.'), effortUnit: 'kmh', zone: zoneM ? +zoneM[1] : 0 }
      return { value: '', zone: zoneM ? +zoneM[1] : 0 }
    }

    // ── 1) Intervalles par DISTANCE : « 6x600m », « 10 fois 400 m », « 4x1km » ──
    let m = low.match(/(\d{1,2})\s*(?:x|×|\*|fois)\s*(\d+(?:[.,]\d+)?)\s*(m|km)\b/)
    if (m) {
      const reps = +m[1]
      const dist = parseFloat(m[2].replace(',', '.')) * (m[3] === 'km' ? 1000 : 1)
      // Durée d'un effort : distance × allure (ou vitesse) ; sinon inconnue → ignoré.
      const effSec = paceSec > 0 ? (dist / 1000) * paceSec : (kmh > 0 ? (dist / 1000) / kmh * 3600 : 0)
      if (reps > 0 && effSec > 0) {
        out.push({ id: uid(), mode: 'interval', type: 'effort', durationMin: 0, hrAvg: '', label: seg,
          reps, effortMin: effSec / 60, recoveryMin, distanceM: dist, ...effort() })
        continue
      }
    }

    // ── 2) Intervalles par TEMPS : « 6x3' », « 5 x 2min » ──
    m = low.match(new RegExp(String.raw`(\d{1,2})\s*(?:x|×|\*|fois)\s*(` + TIME_TOKEN + String.raw`)`))
    if (m) {
      const reps = +m[1]; const effSec = timeToSec(m[2])
      if (reps > 0 && effSec > 0) {
        out.push({ id: uid(), mode: 'interval', type: 'effort', durationMin: 0, hrAvg: '', label: seg,
          reps, effortMin: effSec / 60, recoveryMin, ...effort() })
        continue
      }
    }

    // ── 3) Bloc continu par DURÉE : « 10' échauffement », « 30 min Z2 », « 1h » ──
    m = low.match(new RegExp(String.raw`(?:^|\s)(` + TIME_TOKEN + String.raw`|\d{1,3}\s*(?:'|min|h)\b)`))
    if (m) {
      const durSec = timeToSec(m[1])
      if (durSec > 0) {
        const type = /échauff|echauff|warm/.test(low) ? 'warmup' : /cool|calme|retour/.test(low) ? 'cooldown' : /r[ée]cup|repos/.test(low) ? 'recovery' : 'effort'
        out.push({ id: uid(), mode: 'single', type, durationMin: durSec / 60, hrAvg: '', label: seg, ...effort() })
        continue
      }
    }

    // ── 4) Bloc continu par DISTANCE : « 2km à 4:00/km », « 800m » ──
    m = low.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(m|km)\b/)
    if (m && (paceSec > 0 || kmh > 0)) {
      const dist = parseFloat(m[1].replace(',', '.')) * (m[2] === 'km' ? 1000 : 1)
      const durSec = paceSec > 0 ? (dist / 1000) * paceSec : (dist / 1000) / kmh * 3600
      if (dist > 0 && durSec > 0) {
        out.push({ id: uid(), mode: 'single', type: 'effort', durationMin: durSec / 60, hrAvg: '', label: seg, distanceM: dist, ...effort() })
      }
    }
  }
  return out
}
