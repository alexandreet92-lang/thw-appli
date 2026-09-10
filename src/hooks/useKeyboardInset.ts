'use client'
// ══════════════════════════════════════════════════════════════════════════
// Hauteur du clavier logiciel (iOS/Android web) via visualViewport.
// Sur iOS Safari, le clavier RECOUVRE la page (le layout viewport ne rétrécit
// pas) → un champ d'écriture en bas se retrouve caché. Ce hook renvoie la hauteur
// occupée par le clavier ; les composeurs l'utilisent pour se placer JUSTE
// au-dessus du clavier (paddingBottom / translateY).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const update = () => {
      // Espace masqué en bas = fenêtre − (hauteur visible + décalage haut).
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      setInset(kb > 80 ? kb : 0) // seuil : ignore les petites variations (barres)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return inset
}
