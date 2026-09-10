'use client'
// ══════════════════════════════════════════════════════════════════════════
// PressPop — bouton qui GROSSIT au toucher/clic (effet ressort façon Claude).
// À utiliser pour les boutons ronds « + » et « × » (croix) de l'app : au press
// le cercle grossit vite avec un léger rebond, puis revient au relâcher.
//
// Rend un <button>. Toutes les props <button> sont transmises (onClick, disabled,
// aria-label, title, type…). Le `style` fourni est conservé ; on n'ajoute que la
// transform d'échelle + la transition ressort (transformOrigin centré).
// ══════════════════════════════════════════════════════════════════════════
import { forwardRef, useState } from 'react'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Échelle atteinte pendant l'appui (défaut 1.18). */
  popScale?: number
}

const SPRING = 'transform 170ms cubic-bezier(0.34, 1.56, 0.64, 1)'

const PressPop = forwardRef<HTMLButtonElement, Props>(function PressPop(
  { popScale = 1.18, style, disabled, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, children, ...rest },
  ref,
) {
  const [pressed, setPressed] = useState(false)
  const base = style?.transform ? `${style.transform} ` : ''
  return (
    <button
      ref={ref}
      disabled={disabled}
      onPointerDown={e => {
        if (!disabled) { setPressed(true); try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ } }
        onPointerDown?.(e)
      }}
      onPointerUp={e => { setPressed(false); onPointerUp?.(e) }}
      onPointerLeave={e => { setPressed(false); onPointerLeave?.(e) }}
      onPointerCancel={e => { setPressed(false); onPointerCancel?.(e) }}
      style={{
        ...style,
        transform: `${base}scale(${pressed && !disabled ? popScale : 1})`,
        transformOrigin: 'center',
        transition: style?.transition ? `${style.transition}, ${SPRING}` : SPRING,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...rest}
    >
      {children}
    </button>
  )
})

export default PressPop
