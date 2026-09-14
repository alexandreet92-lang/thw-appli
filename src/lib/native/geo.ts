'use client'
// ══════════════════════════════════════════════════════════════════════════
// Géolocalisation multi-plateforme.
// · App native (Capacitor iOS/Android) → plugin @capacitor/geolocation (natif).
//   INDISPENSABLE : `navigator.geolocation` NE FONCTIONNE PAS dans la WebView
//   iOS (WKWebView) — il ne rappelle jamais → « Recherche GPS… » à l'infini.
// · Web (Safari / navigateur) → navigator.geolocation classique.
// Interface unifiée : watchPosition(onPos, onErr, opts) → { clear() }.
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp } from './platform'

export interface GeoOpts { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
export interface GeoHandle { clear: () => void }

// Position renvoyée au format W3C (coords + timestamp) dans les deux cas — le
// plugin Capacitor expose exactement la même forme.
type GeoPos = GeolocationPosition
type GeoErr = { code?: number; message?: string }

let geoMod: typeof import('@capacitor/geolocation') | null = null
async function loadNative() {
  if (geoMod) return geoMod
  geoMod = await import('@capacitor/geolocation')
  return geoMod
}

export function watchPosition(onPos: (p: GeoPos) => void, onErr: (e: GeoErr) => void, opts: GeoOpts = {}): GeoHandle {
  // ── WEB : navigator.geolocation (synchrone, comportement inchangé) ──
  if (!isNativeApp()) {
    let id: number | null = null
    try { id = navigator.geolocation.watchPosition(onPos, e => onErr(e), opts) }
    catch (e) { onErr({ message: String(e) }) }
    return { clear: () => { if (id != null) { try { navigator.geolocation.clearWatch(id) } catch { /* ignore */ } id = null } } }
  }

  // ── NATIF : plugin @capacitor/geolocation (asynchrone) ──
  let cleared = false
  let nativeId: string | null = null
  void (async () => {
    try {
      const { Geolocation } = await loadNative()
      // Demande l'autorisation (déclenche le prompt iOS la 1re fois).
      try { await Geolocation.requestPermissions() } catch { /* l'utilisateur peut refuser */ }
      if (cleared) return
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: opts.enableHighAccuracy ?? true, timeout: opts.timeout, maximumAge: opts.maximumAge },
        (position, err) => {
          if (cleared) return
          if (err) { onErr({ message: String((err as { message?: string })?.message ?? err) }); return }
          if (position) onPos(position as unknown as GeoPos)
        },
      )
      nativeId = id
      if (cleared) { try { await Geolocation.clearWatch({ id }) } catch { /* ignore */ } }
    } catch (e) { onErr({ message: String(e) }) }
  })()
  return {
    clear: () => {
      cleared = true
      if (nativeId != null && geoMod) { try { void geoMod.Geolocation.clearWatch({ id: nativeId }) } catch { /* ignore */ } nativeId = null }
    },
  }
}

export function getCurrentPosition(onPos: (p: GeoPos) => void, onErr: (e: GeoErr) => void, opts: GeoOpts = {}): void {
  if (!isNativeApp()) {
    try { navigator.geolocation.getCurrentPosition(onPos, e => onErr(e), opts) }
    catch (e) { onErr({ message: String(e) }) }
    return
  }
  void (async () => {
    try {
      const { Geolocation } = await loadNative()
      try { await Geolocation.requestPermissions() } catch { /* ignore */ }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: opts.enableHighAccuracy ?? true, timeout: opts.timeout, maximumAge: opts.maximumAge })
      onPos(pos as unknown as GeoPos)
    } catch (e) { onErr({ message: String(e) }) }
  })()
}
