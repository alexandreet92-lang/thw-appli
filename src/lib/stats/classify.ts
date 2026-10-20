// Classification serveur des visites (source, appareil, navigateur). Pure, sans I/O.

export type Source = 'direct' | 'instagram' | 'qr' | 'google' | 'autres_reseaux' | 'externe'

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|node-fetch|axios|vercel|go-http/i

export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua)
}

export function deviceOf(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function browserOf(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/crios|chrome/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Autre'
}

/** Origine d'une visite. Priorité : QR > utm_source > domaine de provenance > direct. */
export function sourceOf(opts: { qr?: string | null; utm?: string | null; refHost?: string | null }): Source {
  if (opts.qr) return 'qr'
  const raw = (opts.utm || opts.refHost || '').toLowerCase()
  if (!raw) return 'direct'
  if (/instagram|(^|\.)ig$/.test(raw)) return 'instagram'
  if (/google|bing|duckduckgo|ecosia|qwant|yahoo/.test(raw)) return 'google'
  if (/facebook|fb\.|tiktok|youtube|youtu\.be|linkedin|twitter|(^|\.)x\.com|reddit|strava|whatsapp|snapchat|pinterest/.test(raw)) return 'autres_reseaux'
  if (/the-hybridway|thw-appli/.test(raw)) return 'direct'
  return 'externe'
}

const clean = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

export const cleanText = clean
