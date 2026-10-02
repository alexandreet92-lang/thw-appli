'use client'
// ════════════════════════════════════════════════════════════════════
// RecordKit — primitives visuelles PARTAGÉES du flux d'enregistrement
// (départ → direct → pause → résumé). Grammaire des maquettes validées
// mock8 r1–r4 : boutons ronds flottants, pilule d'état, carte héro +
// grille à filets, pagination en pilule, contrôles ronds (verrou / pause /
// lap), pilules Reprendre / Terminer, feuilles à glisser pour fermer.
// Couche de PRÉSENTATION pure : aucune logique d'enregistrement ici.
// Tokens globaux uniquement ; le thème (clair/sombre forcé par les
// réglages d'un écran) se pose via rkScope(isDark) sur le conteneur.
// ════════════════════════════════════════════════════════════════════
import {
  Children, cloneElement, isValidElement, useEffect, useRef, useState,
  type CSSProperties, type ReactElement, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react'
import { haptic } from '@/lib/haptics'
import './recordKit.css'

// ── Thème / mouvement ────────────────────────────────────────────────
/** Classe du conteneur d'un écran : tokens clair/sombre + police. */
export function rkScope(isDark: boolean): string {
  return `rk-scope ${isDark ? 'dark' : 'light'}`
}
/** Ressort « premium » commun (transitions d'écrans, feuilles). */
export const RK_SPRING = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.9 }
export const RK_EASE = [0.22, 1, 0.36, 1] as const

/** Lit le thème réel de l'app (classe html.dark) et le suit. */
export function useAppDark(): boolean {
  const [d, setD] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const f = () => setD(el.classList.contains('dark'))
    f()
    const obs = new MutationObserver(f)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return d
}

// ── Icônes (traits 2 px, 24×24) ──────────────────────────────────────
export function RkIco({ d, size = 20, sw = 2, fill = 'none' }: { d: ReactNode; size?: number; sw?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      {d}
    </svg>
  )
}
export const RK_ICON = {
  close:   <path d="M18 6 6 18M6 6l12 12" />,
  back:    <path d="m15 18-6-6 6-6" />,
  plus:    <path d="M12 5v14M5 12h14" />,
  chev:    <path d="m9 18 6-6-6-6" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  lock:    <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  unlock:  <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
  route:   <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
  calendar:<><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  heart:   <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  pulse:   <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  gps:     <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></>,
  live:    <><circle cx="12" cy="12" r="2.5" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M4.5 4.5a10 10 0 0 0 0 15M19.5 4.5a10 10 0 0 1 0 15" /></>,
  sound:   <><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></>,
  pause:   <><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>,
  camera:  <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  mic:     <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  skip:    <><path d="M5 4l10 8-10 8V4z" /><path d="M19 5v14" /></>,
  check:   <path d="M4 12.5 9.5 18 20 6.5" />,
  flag:    <path d="M4 22V4s1-1 4-1 5 2 8 2 4-1 4-1v11s-1 1-4 1-5-2-8-2-4 1-4 1" />,
  edit:    <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash:   <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  globe:   <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  users:   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  bolt:    <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  layers:  <><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></>,
  play:    <path d="M7 4v16l13-8z" />,
}

// ── Bouton rond flottant ─────────────────────────────────────────────
export function RkFab({ label, onClick, children, size = 44, variant = 'float', disabled, style, className }: {
  label: string; onClick?: () => void; children: ReactNode; size?: number
  variant?: 'float' | 'dark' | 'primary' | 'ghost'; disabled?: boolean; style?: CSSProperties; className?: string
}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled}
      onClick={() => { if (disabled) return; haptic('light'); onClick?.() }}
      className={`rk-fab rk-press${className ? ` ${className}` : ''}`} data-variant={variant}
      style={{ width: size, height: size, opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  )
}

/** Espace réservé de la taille d'un bouton rond (alignement de l'en-tête). */
export function RkFabSpacer({ size = 44 }: { size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, flexShrink: 0 }} />
}

// ── Pilule d'état (en-tête) ──────────────────────────────────────────
export function RkStatusPill({ dot, live, children, onClick }: {
  dot?: string; live?: boolean; children: ReactNode; onClick?: () => void
}) {
  const inner = (
    <>
      {dot && <span className="rk-dot" data-live={live ? '1' : undefined} style={{ background: dot }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </>
  )
  if (onClick) {
    return <button type="button" onClick={onClick} className="rk-pill rk-press" style={{ border: 'none', color: 'var(--text)', cursor: 'pointer' }}>{inner}</button>
  }
  return (
    <motion.span layout className="rk-pill" transition={{ layout: { duration: 0.3, ease: RK_EASE } }}>{inner}</motion.span>
  )
}

/** Couleurs des points d'état (sémantiques). */
export const RK_DOT = {
  rec: 'var(--danger)',
  ok: 'var(--success)',
  warn: '#EAB308', // design-allow-color — point sémantique « pause / attention » (charge mid)
  idle: 'var(--text-dim)',
  info: 'var(--primary)',
} as const

// ── En-tête : rond gauche · pilule centrée · rond droite ─────────────
export function RkTopBar({ left, center, right, sub, style }: {
  left?: ReactNode; center?: ReactNode; right?: ReactNode; sub?: ReactNode; style?: CSSProperties
}) {
  return (
    <div style={{
      position: 'relative', zIndex: 5, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
      padding: 'calc(env(safe-area-inset-top) + 8px) 14px 8px', ...style,
    }}>
      <div style={{ minWidth: 44, display: 'flex' }}>{left ?? <RkFabSpacer />}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {center}
        {sub && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ minWidth: 44, display: 'flex', justifyContent: 'flex-end' }}>{right ?? <RkFabSpacer />}</div>
    </div>
  )
}

/** Titre d'en-tête (écrans guidés : « Hyrox · Simulation » + sous-titre). */
export function RkTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{children}</div>
}

// ── Chiffre animé (tabulaire, sans gigue) ─────────────────────────────
/** Valeur numérique qui se met à jour avec un léger fondu-glissé. La largeur
 *  est figée par les chiffres tabulaires : rien ne « saute ». */
export function RkValue({ value, style, className }: { value: string; style?: CSSProperties; className?: string }) {
  return <span key={value} className={`rk-num rk-tick${className ? ` ${className}` : ''}`} style={style}>{value}</span>
}

// ── Carte de données ─────────────────────────────────────────────────
export function RkDataCard({ children, style, dim }: { children: ReactNode; style?: CSSProperties; dim?: boolean }) {
  return <div className={dim ? 'rk-card rk-dim' : 'rk-card'} style={style}>{children}</div>
}

export function RkHero({ label, value, unit, size = 64, animate = false }: {
  label: ReactNode; value: string; unit?: string; size?: number; animate?: boolean
}) {
  return (
    <div className="rk-hero">
      <div className="rk-label">{label}</div>
      <div className="rk-hero-v rk-num" style={{ fontSize: size }}>
        {animate ? <RkValue value={value} /> : value}
        {unit && <span style={{ fontSize: Math.max(15, Math.round(size * 0.28)), fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4, letterSpacing: 0 }}>{unit}</span>}
      </div>
    </div>
  )
}

export interface RkCellProps {
  label: ReactNode
  value: string
  unit?: string
  /** Pleine largeur (« héro » secondaire d'une page). */
  big?: boolean
  size?: number
  span?: 1 | 2
  font?: string
  dim?: boolean
}
export function RkCell({ label, value, unit, big, size, span, font, dim }: RkCellProps) {
  const fs = size ?? (big ? 56 : 38)
  return (
    <div className={dim ? 'rk-cell rk-dim' : 'rk-cell'} data-span={big || span === 2 ? '2' : undefined}>
      <div className="rk-label">{label}</div>
      <div className="rk-cell-v">
        <span className="rk-cell-n rk-num" style={{ fontSize: fs, fontFamily: font }}>{value}</span>
        {unit && <span className="rk-cell-u">{unit}</span>}
      </div>
    </div>
  )
}

/** Grille 2 colonnes à filets ; la dernière cellule orpheline prend toute la
 *  largeur (aucun trou de grille). Accepte des RkCell (ou équivalents). */
export function RkGrid({ children }: { children: ReactNode }) {
  const kids = Children.toArray(children).filter(isValidElement) as ReactElement<RkCellProps>[]
  let col = 0
  const out = kids.map((k, i) => {
    const full = !!k.props.big || k.props.span === 2
    if (full) { col = 0; return k }
    const last = i === kids.length - 1 || !!kids[i + 1]?.props.big || kids[i + 1]?.props.span === 2
    const orphan = col === 0 && last
    col = col === 0 ? 1 : 0
    return orphan ? cloneElement(k, { span: 2 }) : k
  })
  return <div className="rk-grid">{out}</div>
}

// ── Pagination ───────────────────────────────────────────────────────
export function RkPageDots({ count, index, onSelect, style }: { count: number; index: number; onSelect?: (i: number) => void; style?: CSSProperties }) {
  if (count <= 1) return null
  return (
    <div className="rk-dots" style={style} role="tablist">
      {Array.from({ length: count }).map((_, i) => (
        onSelect
          ? <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1}/${count}`} onClick={() => onSelect(i)}
              style={{ border: 'none', background: 'transparent', padding: '10px 2px', cursor: 'pointer', display: 'flex' }}>
              <i data-on={i === index ? '1' : undefined} />
            </button>
          : <i key={i} data-on={i === index ? '1' : undefined} />
      ))}
    </div>
  )
}

// ── Pager : balayage horizontal avec élan (ressort) ─────────────────
/** Affiche UNE page à la fois (les pages carte Leaflet ne sont jamais
 *  montées hors écran). Glisser horizontalement change de page ; un
 *  geste commencé sur une carte (.leaflet-container) ou un contrôle est
 *  ignoré. `locked` fige le balayage. */
export function RkPager({ index, count, onIndexChange, locked, children, style }: {
  index: number; count: number; onIndexChange: (i: number) => void; locked?: boolean
  children: ReactNode; style?: CSSProperties
}) {
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const prev = useRef(index)
  const dir = index === prev.current ? 0 : index > prev.current ? 1 : -1
  useEffect(() => { prev.current = index }, [index])

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || count <= 1) return
    const t = e.target as HTMLElement
    if (t.closest('.leaflet-container, input, textarea, select, [data-no-swipe]')) return
    controls.start(e)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if ((offset.x < -60 || velocity.x < -450) && index < count - 1) { haptic('light'); onIndexChange(index + 1) }
    else if ((offset.x > 60 || velocity.x > 450) && index > 0) { haptic('light'); onIndexChange(index - 1) }
  }
  return (
    <div style={{ position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0, ...style }} onPointerDown={onPointerDown}>
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={index}
          custom={dir}
          drag={locked ? false : 'x'}
          dragListener={false}
          dragControls={controls}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={onDragEnd}
          variants={{
            enter: (d: number) => ({ x: reduce ? 0 : d >= 0 ? '40%' : '-40%', opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: reduce ? 0 : d >= 0 ? '-40%' : '40%', opacity: 0 }),
          }}
          initial="enter" animate="center" exit="exit"
          transition={reduce ? { duration: 0.15 } : { x: RK_SPRING, opacity: { duration: 0.22 } }}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Bouton Démarrer (ondulation + haptique) ──────────────────────────
export function RkStartButton({ onClick, disabled, label, size = 96, children, guide }: {
  onClick: () => void; disabled?: boolean; label: string; size?: number; children?: ReactNode; guide?: string
}) {
  const [ripples, setRipples] = useState<number[]>([])
  const fire = () => {
    if (disabled) return
    haptic('heavy')
    const id = Date.now()
    setRipples(r => [...r, id])
    window.setTimeout(() => setRipples(r => r.filter(x => x !== id)), 700)
    onClick()
  }
  return (
    <button type="button" className="rk-start" data-guide={guide} aria-label={label} disabled={disabled} onClick={fire}
      style={{ width: size, height: size, fontSize: size >= 110 ? 18 : 15 }}>
      {ripples.map(id => <span key={id} className="rk-ripple" />)}
      <span style={{ position: 'relative' }}>{children ?? label}</span>
    </button>
  )
}

// ── Contrôles du direct (verrou · pause · lap) ───────────────────────
const PauseGlyph = ({ s = 30 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
)
const PlayGlyph = ({ s = 30 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9 3.94a1 1 0 0 0-1.5.86Z" /></svg>
)
export { PauseGlyph, PlayGlyph }

/** Rangée de contrôles ronds. Le bouton central est le gros bouton sombre. */
export function RkControlRow({ left, center, right }: { left?: ReactNode; center: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34 }}>
      <div style={{ width: 56, display: 'flex', justifyContent: 'center' }}>{left}</div>
      {center}
      <div style={{ width: 56, display: 'flex', justifyContent: 'center' }}>{right}</div>
    </div>
  )
}

/** Gros bouton central rond (pause ▸ lecture). */
export function RkBigButton({ label, onClick, children, variant = 'dark', size = 84 }: {
  label: string; onClick: () => void; children: ReactNode; variant?: 'dark' | 'primary'; size?: number
}) {
  return (
    <motion.button type="button" aria-label={label} title={label}
      onClick={() => { haptic('medium'); onClick() }}
      whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      className="rk-fab" data-variant={variant}
      style={{ width: size, height: size, boxShadow: 'var(--shadow-capsule)' }}>
      {children}
    </motion.button>
  )
}

/** Pilules de pause : « Reprendre » (cyan) + « Terminer » (blanche). */
export function RkPausePills({ resumeLabel, finishLabel, onResume, onFinish }: {
  resumeLabel: string; finishLabel: string; onResume: () => void; onFinish: () => void
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : 24 }}
      transition={reduce ? { duration: 0.12 } : RK_SPRING}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', padding: '0 16px' }}>
      <RkCta variant="primary" onClick={() => { haptic('medium'); onResume() }}>{resumeLabel}</RkCta>
      <RkCta variant="white" onClick={() => { haptic('light'); onFinish() }}>{finishLabel}</RkCta>
    </motion.div>
  )
}

/** Barre de contrôles du direct, positionnée en bas d'écran, avec transitions
 *  ressort entre états (prêt → enregistrement → pause → verrouillé). */
export function RkControlDock({ stateKey, children, bottom = 34 }: { stateKey: string; children: ReactNode; bottom?: number }) {
  const reduce = useReducedMotion()
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(env(safe-area-inset-bottom) + ${bottom}px)`, zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={stateKey}
          initial={{ opacity: 0, y: reduce ? 0 : 18, scale: reduce ? 1 : 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.97 }}
          transition={reduce ? { duration: 0.12 } : { ...RK_SPRING, opacity: { duration: 0.18 } }}
          style={{ pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Bouton de déverrouillage (double tap). */
export function RkUnlock({ hint, label, onUnlock }: { hint: string; label: string; onUnlock: () => void }) {
  const last = useRef(0)
  const ref = useRef<HTMLButtonElement>(null)
  const tap = () => {
    const now = Date.now()
    if (now - last.current < 400) { haptic('medium'); onUnlock(); last.current = 0; return }
    last.current = now
    haptic('light')
    const el = ref.current
    if (el) { el.classList.remove('rk-lock-pulse'); void el.offsetWidth; el.classList.add('rk-lock-pulse') }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span className="rk-banner" style={{ animation: 'none' }}>{hint}</span>
      <button ref={ref} type="button" aria-label={label} onClick={tap} className="rk-fab"
        style={{ width: 72, height: 72, background: 'var(--text)', color: 'var(--bg)' }}>
        <RkIco d={RK_ICON.lock} size={26} />
      </button>
    </div>
  )
}

// ── Bandeau (pilule) ─────────────────────────────────────────────────
export function RkBanner({ dot, children, style, live }: { dot?: string; children: ReactNode; style?: CSSProperties; live?: boolean }) {
  return (
    <span className="rk-banner" style={style} role="status">
      {dot && <span className="rk-dot" data-live={live ? '1' : undefined} style={{ background: dot }} />}
      {children}
    </span>
  )
}

/** Zone flottante centrée sous l'en-tête pour les bandeaux transitoires. */
export function RkBannerSlot({ children, top = 64 }: { children: ReactNode; top?: number }) {
  return (
    <div style={{ position: 'absolute', left: 16, right: 16, top: `calc(env(safe-area-inset-top) + ${top}px)`, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
      {children}
    </div>
  )
}

// ── Pilule pleine largeur ────────────────────────────────────────────
export function RkCta({ children, onClick, variant = 'primary', disabled, progress, style, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'white' | 'dark' | 'danger' | 'text' | 'text-danger'
  disabled?: boolean; progress?: number | null; style?: CSSProperties; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="rk-cta rk-press" data-variant={variant} style={style}>
      {progress != null && (
        <span aria-hidden className="rk-cta-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})` }} />
      )}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
    </button>
  )
}

// ── Listes groupées ──────────────────────────────────────────────────
export function RkGroup({ children, tone = 'card', style }: { children: ReactNode; tone?: 'card' | 'chip'; style?: CSSProperties }) {
  return <div className="rk-group" data-tone={tone === 'chip' ? 'chip' : undefined} style={style}>{children}</div>
}

/** Tuile d'icône teintée (couleur sport / fonctionnelle à faible opacité). */
export function RkTile({ color, children, size = 40 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <span className="rk-tile" style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
      {children}
    </span>
  )
}

export function RkRow({ icon, label, sub, value, onClick, right, chevron = true, danger, disabled }: {
  icon?: ReactNode; label: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void
  right?: ReactNode; chevron?: boolean; danger?: boolean; disabled?: boolean
}) {
  const inner = (
    <>
      {icon}
      <span className="rk-row-t">
        <b style={danger ? { color: 'var(--danger)' } : undefined}>{label}</b>
        {sub && <span>{sub}</span>}
      </span>
      {value != null && value !== '' && <span className="rk-row-v">{value}</span>}
      {right}
      {onClick && chevron && !disabled && <span style={{ color: 'var(--text-dim)', display: 'flex' }}><RkIco d={RK_ICON.chev} size={18} /></span>}
    </>
  )
  if (!onClick) return <div className="rk-row" data-icon={icon ? '1' : undefined}>{inner}</div>
  return (
    <button type="button" className="rk-row" data-icon={icon ? '1' : undefined} disabled={disabled}
      onClick={() => { haptic('light'); onClick() }} style={{ opacity: disabled ? 0.5 : 1 }}>
      {inner}
    </button>
  )
}

export function RkToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="rk-toggle"
      onClick={e => { e.stopPropagation(); haptic('light'); onChange(!on) }} />
  )
}

export function RkSectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 4px 8px' }}>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{children}</span>
      {right}
    </div>
  )
}

/** Puce d'état (cardio, capteur, auto-pause, réglages). */
export function RkChip({ dot, children, onClick, off }: { dot?: string; children: ReactNode; onClick?: () => void; off?: boolean }) {
  return (
    <button type="button" className="rk-chip rk-press" data-off={off ? '1' : undefined} onClick={() => { haptic('light'); onClick?.() }}>
      {dot && <span className="rk-dot" style={{ background: dot }} />}
      {children}
    </button>
  )
}

// ── Feuille du bas (glisser pour fermer) ─────────────────────────────
/** Feuille portail : voile + panneau qui suit le doigt. Le geste démarre sur
 *  la poignée / l'en-tête (le corps reste défilable). */
export function RkSheet({ open, onClose, children, title, sub, footer, isDark, zIndex = 10060, surface = 'page', full, label, left, right, locked }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; sub?: ReactNode; footer?: ReactNode
  isDark?: boolean; zIndex?: number; surface?: 'page' | 'card'; full?: boolean; label?: string
  left?: ReactNode; right?: ReactNode; locked?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const dark = useAppDark()
  const themeDark = isDark ?? dark
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose, locked])
  if (!mounted) return null
  const close = () => { if (!locked) onClose() }
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="rk-sheet" className={rkScope(themeDark)} style={{ position: 'fixed', inset: 0, zIndex }}>
          <motion.div aria-hidden onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            style={{ position: 'absolute', inset: 0, background: 'var(--scrim)' }} />
          <motion.div role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            className="rk-sheet" data-surface={surface === 'card' ? 'card' : undefined}
            initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 40 }}
            drag={locked ? false : 'y'} dragListener={false} dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) close() }}
            style={{ height: full ? 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)' : undefined }}>
            <div onPointerDown={e => controls.start(e)} style={{ flexShrink: 0, touchAction: 'none', cursor: 'grab' }}>
              <div className="rk-grab" />
              {(title || left || right) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 10px' }}>
                  <div style={{ minWidth: 44, display: 'flex' }}>{left}</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    {title && <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
                    {sub && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{sub}</div>}
                  </div>
                  <div style={{ minWidth: 44, display: 'flex', justifyContent: 'flex-end' }}>
                    {right ?? (locked ? null : <RkFab label="×" onClick={close} size={36} variant="ghost"><RkIco d={RK_ICON.close} size={16} sw={2.4} /></RkFab>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0 16px', paddingBottom: footer ? 12 : 'calc(24px + env(safe-area-inset-bottom))' }}>
              {children}
            </div>
            {footer && (
              <div style={{ flexShrink: 0, padding: '10px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Feuille « échelle » (RPE /10, ressenti /5…) : grosse valeur + curseur. */
export function RkRangeSheet({ open, onClose, title, subtitle, value, min = 0, max, step = 1, color = 'var(--primary)', caption, minLabel, maxLabel, onChange, isDark, zIndex = 10080, okLabel = 'OK' }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; value: number; min?: number; max: number; step?: number
  color?: string; caption?: string; minLabel?: string; maxLabel?: string; onChange: (v: number) => void; isDark?: boolean; zIndex?: number; okLabel?: string
}) {
  const pct = ((value - min) / Math.max(1e-6, max - min)) * 100
  const fmt = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ','))
  return (
    <RkSheet open={open} onClose={onClose} title={title} sub={subtitle} isDark={isDark} zIndex={zIndex}
      footer={<RkCta variant="primary" onClick={onClose}>{okLabel}</RkCta>}>
      <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
        <span className="rk-num" style={{ fontSize: 72, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          <RkValue value={fmt(value)} />
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-mid)' }}> / {max}</span>
        {caption && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, fontSize: 15, fontWeight: 700 }}>
          <span className="rk-dot" style={{ background: color }} />{caption}
        </div>}
      </div>
      <input type="range" className="rk-range" min={min} max={max} step={step} value={value}
        onChange={e => { const v = Number(e.target.value); if (v !== value) haptic('light'); onChange(v) }}
        style={{ ['--rk-fill' as string]: `${pct}%`, ['--rk-color' as string]: color, margin: '22px 0 6px' } as CSSProperties} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
        <span>{minLabel ?? min}</span><span>{maxLabel ?? max}</span>
      </div>
    </RkSheet>
  )
}

export interface RkPickItem { id: string; label: ReactNode; sub?: ReactNode; icon?: ReactNode }
/** Feuille de sélection (liste groupée avec coche). */
export function RkPickSheet({ open, onClose, title, items, selectedId, onPick, emptyLabel, isDark, zIndex = 10080 }: {
  open: boolean; onClose: () => void; title: string; items: RkPickItem[]; selectedId: string | null
  onPick: (id: string) => void; emptyLabel?: string; isDark?: boolean; zIndex?: number
}) {
  return (
    <RkSheet open={open} onClose={onClose} title={title} isDark={isDark} zIndex={zIndex}>
      {items.length === 0 ? (
        <p style={{ fontSize: 15, color: 'var(--text-mid)', padding: '16px 4px', textAlign: 'center' }}>{emptyLabel}</p>
      ) : (
        <RkGroup>
          {items.map(it => (
            <RkRow key={it.id} icon={it.icon} label={it.label} sub={it.sub} chevron={false}
              onClick={() => onPick(it.id)}
              right={it.id === selectedId ? <span style={{ color: 'var(--primary)', display: 'flex' }}><RkIco d={RK_ICON.check} size={20} sw={2.6} /></span> : undefined} />
          ))}
        </RkGroup>
      )}
    </RkSheet>
  )
}

/** Feuilles montées « à la demande » (le parent les démonte à la fermeture) :
 *  garde la feuille ouverte puis rappelle onClose après l'animation de sortie. */
export function useSheetClose(onClose: () => void, ms = 300): [boolean, () => void] {
  const [open, setOpen] = useState(true)
  const done = useRef(false)
  const close = () => {
    if (done.current) return
    done.current = true
    setOpen(false)
    window.setTimeout(onClose, ms)
  }
  return [open, close]
}

// ── Transition d'écran (entrée par le bas en ressort) ────────────────
export function RkScreenIn({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0.15 } : { ...RK_SPRING, opacity: { duration: 0.24 } }}
      style={style}>
      {children}
    </motion.div>
  )
}

/** Mise en forme d'une durée h:mm:ss (ou mm:ss sous l'heure). */
export function rkClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
