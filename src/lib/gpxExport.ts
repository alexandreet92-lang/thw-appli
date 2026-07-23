// Export d'un parcours au format GPX 1.1 — le format universel accepté par
// Garmin, Wahoo, Polar, Coros, Suunto et Strava. L'utilisateur télécharge le
// fichier puis l'importe sur son compteur / sa montre (ou dans Strava).
// (Il n'existe pas d'API publique pour « pousser » un itinéraire directement
//  dans Strava/Garmin/Polar — le GPX est la voie standard, compatible partout.)

export interface GpxPoint { lat: number; lng: number; altitude?: number | null }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Interpole l'altitude du profil (distance→altitude) sur les points du tracé.
function altitudeAt(profile: { distanceM: number; altitudeM: number }[] | undefined, ratio: number): number | null {
  if (!profile || profile.length < 2) return null
  const total = profile[profile.length - 1].distanceM || 1
  const d = ratio * total
  let lo = 0, hi = profile.length - 1
  while (lo < hi) { const m = (lo + hi) >> 1; if (profile[m].distanceM < d) lo = m + 1; else hi = m }
  return Math.round(profile[lo].altitudeM)
}

export function routeToGpx(
  name: string,
  points: GpxPoint[],
  elevationProfile?: { distanceM: number; altitudeM: number }[],
): string {
  const n = points.length
  const trkpts = points.map((p, i) => {
    const ele = p.altitude != null ? p.altitude : altitudeAt(elevationProfile, n > 1 ? i / (n - 1) : 0)
    const eleTag = ele != null ? `<ele>${ele}</ele>` : ''
    return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">${eleTag}</trkpt>`
  }).join('\n')

  // <rte> (route) ET <trk> (track) : certains appareils lisent l'un, d'autres
  // l'autre — on met les deux pour une compatibilité maximale.
  const rtepts = points.map(p => `    <rtept lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"></rtept>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="THW Coaching" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(name)}</name></metadata>
  <rte>
    <name>${esc(name)}</name>
${rtepts}
  </rte>
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

export function downloadGpx(name: string, gpx: string): void {
  try {
    const safe = (name || 'parcours').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim() || 'parcours'
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safe}.gpx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch { /* ignore */ }
}
