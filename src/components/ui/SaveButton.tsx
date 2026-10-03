'use client'
// ──────────────────────────────────────────────────────────────────────────
// SaveButton — bouton « Enregistrer » à machine d'états :
//   idle → saving (petit anneau) → success (fond vert + coche dessinée) → idle
//                                → error   (rouge + secousse)            → idle
// La confirmation reste SUR PLACE : la sauvegarde est enveloppée dans
// withLocalSaveFeedback() → la pastille globale ne double pas l'information.
// Un échec est détecté si onSave jette, renvoie `false`, renvoie `{ error }`
// non nul, OU si une mutation Supabase a signalé une erreur pendant l'appel.
//
// Variantes : 'primary' (pilule cyan), 'text' (lien d'action, ex. MTextBtn),
// 'round' (rond 44 px façon ✓ des réglages iOS).
// useSaveAction() expose la même machine pour un bouton maison.
// ──────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { withLocalSaveFeedback } from '@/lib/ui/saveToast'
import { haptic } from '@/lib/haptics'

export type SaveState = 'idle' | 'saving' | 'success' | 'error'
export type SaveResult = boolean | void | null | undefined | { error?: unknown }

const MIN_SAVING_MS = 320
const SUCCESS_MS = 1300
const ERROR_MS = 1700

function isFailure(r: unknown): boolean {
  if (r === false) return true
  if (r && typeof r === 'object' && 'error' in r) return Boolean((r as { error?: unknown }).error)
  return false
}

export interface UseSaveAction {
  state: SaveState
  /** Lance la sauvegarde. Renvoie true si elle a réussi. */
  run: (fn: () => Promise<SaveResult> | SaveResult) => Promise<boolean>
  reset: () => void
}

export function useSaveAction(opts: { onSuccess?: () => void; onError?: () => void } = {}): UseSaveAction {
  const [state, setState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const alive = useRef(true)
  const optsRef = useRef(opts)
  optsRef.current = opts
  useEffect(() => () => { alive.current = false; clearTimeout(timer.current) }, [])

  const run = useCallback(async (fn: () => Promise<SaveResult> | SaveResult): Promise<boolean> => {
    clearTimeout(timer.current)
    setState('saving')
    const started = Date.now()
    const out = await withLocalSaveFeedback(fn)
    const failed = out.errored || isFailure(out.value)
    const wait = MIN_SAVING_MS - (Date.now() - started)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    if (!alive.current) return !failed
    setState(failed ? 'error' : 'success')
    haptic(failed ? 'heavy' : 'success')
    timer.current = setTimeout(() => {
      if (!alive.current) return
      setState('idle')
      if (failed) optsRef.current.onError?.(); else optsRef.current.onSuccess?.()
    }, failed ? ERROR_MS : SUCCESS_MS)
    return !failed
  }, [])

  const reset = useCallback(() => { clearTimeout(timer.current); setState('idle') }, [])
  return { state, run, reset }
}

const CSS = `
.svb { position: relative; display: inline-grid; place-items: center; border: none; cursor: pointer; font-family: var(--font-body);
  transition: background-color .28s ease, color .28s ease, box-shadow .28s ease, opacity .2s ease; -webkit-tap-highlight-color: transparent; }
.svb:disabled { cursor: default; }
.svb > .svb-layer { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;
  transition: opacity .2s ease, transform .28s cubic-bezier(.34,1.56,.64,1); }
.svb .svb-off { opacity: 0; transform: scale(.85); pointer-events: none; }
.svb-spin { width: 15px; height: 15px; animation: svbSpin .8s linear infinite; }
.svb-check { stroke-dasharray: 22; stroke-dashoffset: 22; }
.svb-success .svb-check { animation: svbDraw .34s cubic-bezier(.65,0,.35,1) .06s forwards; }
.svb-error { animation: svbShake .42s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes svbSpin { to { transform: rotate(360deg); } }
@keyframes svbDraw { to { stroke-dashoffset: 0; } }
@keyframes svbShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
@media (prefers-reduced-motion: reduce) {
  .svb, .svb > .svb-layer { transition: opacity .15s linear; }
  .svb .svb-off { transform: none; }
  .svb-spin { animation-duration: 1.6s; }
  .svb-success .svb-check { animation: none; stroke-dashoffset: 0; }
  .svb-error { animation: none; }
}
`

function Spinner() {
  return (
    <svg className="svb-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14.2 8A6.2 6.2 0 0 0 8 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function CheckMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path className="svb-check" d="M3 8.4l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CrossMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export interface SaveButtonProps {
  onSave: () => Promise<SaveResult> | SaveResult
  label: ReactNode
  savedLabel?: ReactNode
  errorLabel?: ReactNode
  disabled?: boolean
  variant?: 'primary' | 'text' | 'round'
  /** Appelé une fois l'état « succès » affiché (ex. refermer une sous-page). */
  onSuccess?: () => void
  ariaLabel?: string
  style?: CSSProperties
  /** Machine d'états externe (si le parent veut piloter / lire l'état). */
  action?: UseSaveAction
}

export function SaveButton({
  onSave, label, savedLabel, errorLabel, disabled, variant = 'primary', onSuccess, ariaLabel, style, action,
}: SaveButtonProps) {
  const own = useSaveAction({ onSuccess })
  const { state, run } = action ?? own
  const busy = state === 'saving'
  const isRound = variant === 'round'

  const palette: Record<SaveState, CSSProperties> = variant === 'text'
    ? {
        idle: { background: 'transparent', color: disabled ? 'var(--text-dim)' : 'var(--primary)' },
        saving: { background: 'transparent', color: 'var(--text-mid)' },
        success: { background: 'transparent', color: 'var(--success)' },
        error: { background: 'transparent', color: 'var(--danger)' },
      }
    : isRound
      ? {
          idle: { background: disabled ? 'var(--text-dim)' : 'var(--text)', color: 'var(--surface-card)' },
          saving: { background: 'var(--text)', color: 'var(--surface-card)' },
          success: { background: 'var(--success)', color: 'var(--on-primary)' },
          error: { background: 'var(--danger)', color: 'var(--on-primary)' },
        }
      : {
          idle: { background: disabled ? 'var(--bg-card2)' : 'var(--primary)', color: disabled ? 'var(--text-dim)' : 'var(--on-primary)' },
          saving: { background: 'var(--primary)', color: 'var(--on-primary)' },
          success: { background: 'var(--success)', color: 'var(--on-primary)' },
          error: { background: 'var(--danger)', color: 'var(--on-primary)' },
        }

  const shape: CSSProperties = isRound
    ? { width: 44, height: 44, borderRadius: '50%', padding: 0, boxShadow: 'var(--shadow-capsule)' }
    : variant === 'text'
      ? { minHeight: 44, minWidth: 44, padding: '0 6px', borderRadius: 'var(--r-sm)', fontSize: 16, fontWeight: 600 }
      : { minHeight: 40, padding: '0 18px', borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 600 }

  const layer = (s: SaveState) => `svb-layer${state === s ? '' : ' svb-off'}`

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-no-fx={state !== 'idle' ? '' : undefined}
        className={`svb svb-${state}`}
        disabled={disabled || state !== 'idle'}
        aria-label={ariaLabel}
        aria-busy={busy}
        onClick={() => { if (!disabled && state === 'idle') void run(onSave) }}
        style={{ ...shape, ...palette[state], ...(disabled && state === 'idle' ? { opacity: variant === 'text' ? 0.5 : 1 } : null), ...style }}
      >
        <span className={layer('idle')}>{isRound ? <CheckMarkStatic /> : label}</span>
        <span className={layer('saving')} aria-hidden={state !== 'saving'}><Spinner /></span>
        <span className={layer('success')} aria-hidden={state !== 'success'}>
          <CheckMark size={isRound ? 20 : 16} />{!isRound && (savedLabel ?? null)}
        </span>
        <span className={layer('error')} aria-hidden={state !== 'error'}>
          <CrossMark size={isRound ? 18 : 15} />{!isRound && (errorLabel ?? null)}
        </span>
        <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {state === 'success' ? (typeof savedLabel === 'string' ? savedLabel : '') : state === 'error' ? (typeof errorLabel === 'string' ? errorLabel : '') : ''}
        </span>
      </button>
    </>
  )
}

function CheckMarkStatic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default SaveButton
