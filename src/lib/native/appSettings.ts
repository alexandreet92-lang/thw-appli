'use client'
// ══════════════════════════════════════════════════════════════════════════
// Ouvre la page Réglages de l'app (iOS : « app-settings: ») — utilisé quand
// une autorisation (Position, Bluetooth) a été refusée. Ordre :
//  1. @capacitor/app-launcher (UIApplication.open) ;
//  2. repli : navigation vers le schéma (Capacitor délègue les schémas non-web
//     à UIApplication).
// No-op sur le web (aucune page de réglages accessible).
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp, isIOS } from './platform'

export async function openAppSettings(): Promise<void> {
  if (!isNativeApp()) return
  const url = isIOS() ? 'app-settings:' : 'package:com.thehybridway.app'
  try {
    const { AppLauncher } = await import('@capacitor/app-launcher')
    const r = await AppLauncher.openUrl({ url })
    if (r.completed) return
  } catch { /* plugin absent → repli */ }
  if (isIOS()) {
    try { window.location.href = 'app-settings:' } catch { /* ignore */ }
  }
}
