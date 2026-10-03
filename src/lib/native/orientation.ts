'use client'
// ══════════════════════════════════════════════════════════════════════════
// Verrouillage PORTRAIT de l'app native (l'app ne doit jamais pivoter).
// Double sécurité : réglage Xcode (Deployment Info › iPhone Orientation :
// Portrait seul + UISupportedInterfaceOrientations) ET verrou runtime via
// @capacitor/screen-orientation au démarrage. No-op sur le web.
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp } from './platform'

export async function lockPortrait(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation')
    await ScreenOrientation.lock({ orientation: 'portrait' })
  } catch { /* plugin absent du projet iOS (cap sync non fait) → réglage Xcode seul */ }
}
