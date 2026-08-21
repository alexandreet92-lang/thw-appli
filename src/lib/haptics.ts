'use client'
// ══════════════════════════════════════════════════════════════════
// Vibration multi-plateforme.
// · App native (Capacitor iOS/Android) → moteur Taptic via @capacitor/haptics.
// · Web Android → navigator.vibrate.
// · Safari iOS (web) → AUCUNE API de vibration n'existe → no-op silencieux.
// Import dynamique pour ne pas alourdir le bundle web.
// ══════════════════════════════════════════════════════════════════

type Kind = 'light' | 'medium' | 'heavy' | 'success'

let hapticsMod: typeof import('@capacitor/haptics') | null = null
let triedLoad = false
let isNative = false

async function ensure(): Promise<void> {
  if (triedLoad) return
  triedLoad = true
  try {
    const core = await import('@capacitor/core')
    isNative = core.Capacitor?.isNativePlatform?.() ?? false
    if (isNative) hapticsMod = await import('@capacitor/haptics')
  } catch { /* pas de Capacitor → web */ }
}

// Vibration « façon notification » : une impulsion nette et courte.
export function haptic(kind: Kind = 'medium'): void {
  void (async () => {
    await ensure()
    if (isNative && hapticsMod) {
      try {
        const { Haptics, ImpactStyle, NotificationType } = hapticsMod
        if (kind === 'success') await Haptics.notification({ type: NotificationType.Success })
        else await Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium })
      } catch { /* ignore */ }
      return
    }
    // Repli web (Android). Safari iOS : navigator.vibrate est absent → no-op.
    try {
      const ms = kind === 'heavy' ? 60 : kind === 'light' ? 15 : kind === 'success' ? 40 : 30
      navigator.vibrate?.(ms)
    } catch { /* ignore */ }
  })()
}
