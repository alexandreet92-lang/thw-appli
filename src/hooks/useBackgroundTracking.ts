'use client'
// ══════════════════════════════════════════════════════════════════════════
// useBackgroundTracking — active le suivi GPS en ARRIÈRE-PLAN pendant une séance.
// `active` reflète l'état « enregistrement en cours » de l'écran (démarré, en
// pause incluse). true → le hub bascule sur le watcher background (écran
// verrouillé / app en fond continuent de livrer des positions) ; false ou
// démontage → retour au foreground et retrait du watcher (bannière + batterie).
//
// Web : no-op (setBackgroundTracking court-circuite hors natif). `onHint` est
// appelé UNE SEULE FOIS (par installation, natif only) au tout premier
// démarrage d'un suivi arrière-plan, pour un rappel discret « autorise la
// localisation sur Toujours » — l'app ne pouvant pas distinguer « Lorsque
// active » de « Toujours » via les API disponibles.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { setBackgroundTracking } from '@/lib/native/geo'
import { isNativeApp } from '@/lib/native/platform'

const HINT_SHOWN_KEY = 'thw_bg_tracking_hint_shown'

export function useBackgroundTracking(active: boolean, onHint?: () => void): void {
  const onHintRef = useRef(onHint)
  onHintRef.current = onHint

  useEffect(() => {
    if (!active) return
    let cancelled = false
    void (async () => {
      const perm = await setBackgroundTracking(true)
      if (cancelled) return
      // Rappel discret (une fois) quand le suivi arrière-plan démarre vraiment.
      if (isNativeApp() && perm !== 'denied' && perm !== 'disabled') {
        try {
          if (!localStorage.getItem(HINT_SHOWN_KEY)) {
            localStorage.setItem(HINT_SHOWN_KEY, '1')
            onHintRef.current?.()
          }
        } catch { /* ignore */ }
      }
    })()
    return () => { cancelled = true; void setBackgroundTracking(false) }
  }, [active])
}
