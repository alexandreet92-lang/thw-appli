'use client'
// ════════════════════════════════════════════════════════════════════
// nativeShare — ouvre la feuille de partage du système (iOS / Android / web).
//  1. App native : plugin Capacitor « Share » s'il est installé côté natif
//     (@capacitor/share) — enregistré par son nom, sans dépendre du paquet JS :
//     disponible dès que le plugin natif est synchronisé, sinon ignoré.
//  2. Navigateur / WKWebView : Web Share API (navigator.share).
//  3. Repli : copie dans le presse-papiers (l'appelant affiche la confirmation).
// Les appels SANS geste utilisateur (ouverture automatique) passent
// `fallbackCopy: false` : un refus du navigateur renvoie 'blocked' au lieu de
// copier en silence — l'interface propose alors le bouton « Partager ».
// ════════════════════════════════════════════════════════════════════
import { Capacitor, registerPlugin } from '@capacitor/core'

interface SharePluginLike {
  share(o: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<{ activityType?: string }>
}
const NativeShare = registerPlugin<SharePluginLike>('Share')

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'blocked' | 'failed'

function errName(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { name?: unknown; message?: unknown }
    return `${typeof o.name === 'string' ? o.name : ''} ${typeof o.message === 'string' ? o.message : ''}`
  }
  return String(e ?? '')
}

/** Copie un texte (API Clipboard, repli textarea + execCommand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

/** Partage natif d'un lien + message. */
export async function shareLink(
  opts: { title: string; text: string; url: string },
  { fallbackCopy = true }: { fallbackCopy?: boolean } = {},
): Promise<ShareResult> {
  // 1. Plugin natif (feuille iOS UIActivityViewController).
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Share')) {
      await NativeShare.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title })
      return 'shared'
    }
  } catch (e) {
    if (/cancel/i.test(errName(e))) return 'cancelled'
  }
  // 2. Web Share API.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url })
      return 'shared'
    } catch (e) {
      const n = errName(e)
      if (/AbortError|cancel/i.test(n)) return 'cancelled'
      if (!fallbackCopy) return 'blocked'
    }
  } else if (!fallbackCopy) {
    return 'blocked'
  }
  // 3. Presse-papiers.
  return (await copyText(`${opts.text} ${opts.url}`)) ? 'copied' : 'failed'
}
