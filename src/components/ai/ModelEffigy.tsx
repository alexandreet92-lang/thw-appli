'use client'
// ══════════════════════════════════════════════════════════════
// ModelEffigy — identité visuelle des modèles IA : le shuriken THW.
//   Hermès = 3 branches · Athéna = 4 branches · Zeus = 6 branches
// (assets /public/logos/logo_{3,4,6}bras.png).
//
// Deux rendus :
//  · `tint` (défaut) — le PNG sert de MASQUE CSS et la forme est peinte
//    dans la couleur du modèle (MODEL_TINT) ou une couleur imposée.
//  · `tint={false}` — le PNG d'origine (bleu de marque), rendu historique
//    du bureau, inchangé.
// `spinning` = rotation continue (génération en cours) ; à l'arrêt la
// rotation se fige en douceur là où elle est (pas de retour arrière).
// Respecte prefers-reduced-motion. N'anime que `transform`.
// ══════════════════════════════════════════════════════════════

import type { CSSProperties } from 'react'
import { MODEL_BADGE } from '@/lib/quick-actions/models'

export type EffigyModel = 'hermes' | 'athena' | 'zeus'

/** Asset shuriken de chaque modèle (3 / 4 / 6 branches). */
export const MODEL_LOGO: Record<EffigyModel, string> = {
  hermes: '/logos/logo_3bras.png',
  athena: '/logos/logo_4bras.png',
  zeus:   '/logos/logo_6bras.png',
}

/** Couleur du modèle sur mobile (alignée sur les points historiques). */
export const MODEL_TINT: Record<EffigyModel, string> = {
  hermes: MODEL_BADGE.hermes.color,
  athena: 'var(--primary)',
  zeus:   MODEL_BADGE.zeus.color,
}

// Vitesse de rotation : Hermès vif, Athéna posée, Zeus puissant.
const SPIN_S: Record<EffigyModel, number> = { hermes: 0.9, athena: 1.4, zeus: 1.15 }

const CSS = `
@keyframes thw_effigy_spin { to { transform: rotate(360deg); } }
.thw-effigy { display: inline-block; flex-shrink: 0; vertical-align: middle;
  animation: thw_effigy_spin var(--effigy-s, 1.4s) linear infinite; animation-play-state: paused;
  transition: opacity 0.2s ease; will-change: transform; }
.thw-effigy[data-spin="1"] { animation-play-state: running; }
@media (prefers-reduced-motion: reduce) { .thw-effigy, .thw-effigy[data-spin="1"] { animation: none; } }
`

export function ModelEffigy({
  model,
  size = 18,
  spinning = false,
  tint = true,
  color,
  title,
  style,
}: {
  model: EffigyModel
  size?: number
  /** Rotation continue (génération en cours). */
  spinning?: boolean
  /** true = forme peinte dans la couleur du modèle ; false = PNG d'origine. */
  tint?: boolean
  /** Couleur imposée (token), prioritaire sur MODEL_TINT. */
  color?: string
  /** Libellé accessible ; sinon décoratif (aria-hidden). */
  title?: string
  style?: CSSProperties
}) {
  const src = MODEL_LOGO[model]
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  const base: CSSProperties = {
    width: size, height: size,
    ['--effigy-s' as string]: `${SPIN_S[model]}s`,
    ...style,
  }
  return (
    <>
      {/* React 19 : <style href> est dédupliqué et hissé dans <head>. */}
      <style href="thw-effigy" precedence="default">{CSS}</style>
      {tint ? (
        <span
          {...a11y}
          className="thw-effigy"
          data-spin={spinning ? '1' : '0'}
          style={{
            ...base,
            background: color ?? MODEL_TINT[model],
            WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
            WebkitMaskSize: 'contain', maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title ?? ''}
          className="thw-effigy"
          data-spin={spinning ? '1' : '0'}
          style={{ ...base, objectFit: 'contain' }}
        />
      )}
    </>
  )
}
