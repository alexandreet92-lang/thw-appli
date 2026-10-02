'use client'
// Primitives UI « éditorial clair » partagées par le SessionEditor mobile.
// Aucune couleur hex : tout via var(--se-*) ou la prop `accent` reçue.
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { useSeM, MKpis, MSeg, MSectionTitle, THUMB_BG, THUMB_SHADOW } from './mobileKit'

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  // Mobile : carte blanche radius 20, sans bordure (padding d'appel conservé).
  if (useSeM()) return <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 16, ...style, border: 'none' }}>{children}</div>
  return (
    <div style={{
      background: 'var(--se-card)', border: '1px solid var(--se-rule)',
      borderRadius: 'var(--se-r)', padding: 16, ...style,
    }}>{children}</div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  if (useSeM()) return <MSectionTitle>{children}</MSectionTitle>
  return (
    <h3 className="se-fr" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: 'var(--se-text)' }}>
      {children}
    </h3>
  )
}

export function FieldLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  if (useSeM()) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6, minHeight: 18 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>{children}</span>
        {right}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, minHeight: 16 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>{children}</span>
      {right}
    </div>
  )
}

/** Bandeau résumé 4 cellules (SM/SN/…). */
export function Banner({ cells }: { cells: { label: string; value: string; color?: string }[] }) {
  // Mobile : tuiles KPI (grille 3 colonnes).
  if (useSeM()) return <div style={{ marginBottom: 12 }}><MKpis cells={cells} /></div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length},1fr)`, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', overflow: 'hidden', marginBottom: 18 }}>
      {cells.map((c, i) => (
        <div key={c.label} style={{ padding: '12px 10px', borderLeft: i ? '1px solid var(--se-rule)' : 'none' }}>
          <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--se-dim)' }}>{c.label}</p>
          <p className="se-fr se-tnum" style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 600, color: c.color ?? 'var(--se-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

/** En-tête de section builder : titre Fraunces + toggle Manuel/IA. */
export function BuilderHeader({ accent, tab, onTab }: { accent: string; tab: 'manual' | 'ai'; onTab: (t: 'manual' | 'ai') => void }) {
  const { t } = useI18n()
  const isM = useSeM()
  if (isM) return <MBuilderHeader tab={tab} onTab={onTab} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <h3 className="se-fr" style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{t('planning.sessionBuilder')}</h3>
      <Segmented accent={accent} value={tab} onChange={onTab} options={[{ key: 'manual', label: t('planning.manual') }, { key: 'ai', label: t('planning.aiPlus') }]} />
    </div>
  )
}

/** En-tête builder MOBILE : « Construction » + segmenté Manuel / ✦ IA. */
export function MBuilderHeader({ tab, onTab }: { tab: 'manual' | 'ai'; onTab: (t: 'manual' | 'ai') => void }) {
  const { t } = useI18n()
  return (
    <div data-guide="builder-mode">
      <MSectionTitle right={
        <div style={{ width: 168, flexShrink: 0 }}>
          <MSeg small value={tab} onChange={onTab} options={[
            { key: 'manual', label: t('planning.manual') },
            { key: 'ai', label: <><span aria-hidden>✦</span> {t('planning.aiPlus').replace(/^\+\s*/, '')}</> },
          ]} />
        </div>
      }>{t('sem.build')}</MSectionTitle>
    </div>
  )
}

/** Toggle segmenté 2 valeurs (Watts/Zone, Allure/%VMA, Distance/Temps…). */
export function Segmented<T extends string>({ value, options, onChange, accent }: {
  value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; accent: string
}) {
  // Mobile : segmenté gris (pilule active blanche), cibles ≥ 44 px.
  if (useSeM()) return <div style={{ display: 'inline-flex', maxWidth: '100%' }}><MSeg fit small value={value} onChange={onChange} options={options} /></div>
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--se-card2)', border: '1px solid var(--se-rule)' }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '5px 13px',
            fontSize: 11.5, fontWeight: on ? 700 : 600,
            background: on ? 'var(--se-card)' : 'transparent',
            color: on ? accent : 'var(--se-dim)',
            boxShadow: on ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
            transition: 'color .15s',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Jauge draggable (clic + glissé), pas discret. Le pouce flotte sur la piste. */
export function Gauge({ value, min, max, step, onChange, color, gradient }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
  color: string; gradient?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isM = useSeM()
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  function apply(clientX: number) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const raw = min + ((clientX - r.left) / r.width) * (max - min)
    const v = Math.round(raw / step) * step
    onChange(Math.max(min, Math.min(max, +v.toFixed(2))))
  }
  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    apply(e.clientX)
  }
  function move(e: React.PointerEvent) { if (e.buttons) apply(e.clientX) }
  if (isM) {
    // Mobile : piste fine grise + remplissage + pouce blanc 24 px (zone de saisie 44 px).
    return (
      <div ref={ref} onPointerDown={down} onPointerMove={move} role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', margin: '0 2px' }}>
        <div style={{ width: '100%', height: 6, borderRadius: 'var(--r-pill)', background: gradient ?? 'var(--sem-field)' }} />
        {!gradient && <div style={{ position: 'absolute', left: 0, height: 6, width: `${pct * 100}%`, borderRadius: 'var(--r-pill)', background: color, pointerEvents: 'none' }} />}
        <span style={{ position: 'absolute', left: `${pct * 100}%`, width: 24, height: 24, borderRadius: '50%', background: THUMB_BG, boxShadow: THUMB_SHADOW, transform: 'translateX(-50%)', pointerEvents: 'none' }} />
      </div>
    )
  }
  return (
    <div ref={ref} onPointerDown={down} onPointerMove={move}
      style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
      <div style={{ width: '100%', height: 8, borderRadius: 'var(--r-sm)', background: gradient ?? 'var(--se-rule)' }} />
      {!gradient && <div style={{ position: 'absolute', left: 0, height: 8, width: `${pct * 100}%`, borderRadius: 'var(--r-sm)', background: color, pointerEvents: 'none' }} />}
      <span style={{ position: 'absolute', left: `${pct * 100}%`, width: 18, height: 18, borderRadius: '50%', background: 'var(--se-card)', border: `2px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

/** Stepper − valeur + (saisie libre au centre). */
export function Stepper({ value, onChange, onDec, onInc, unit, placeholder, big }: {
  value: string; onChange: (v: string) => void; onDec: () => void; onInc: () => void
  unit?: string; placeholder?: string; big?: boolean
}) {
  const isM = useSeM()
  if (isM) {
    // Mobile : champ gris arrondi sans bordure, boutons 44 px.
    const mb: React.CSSProperties = { width: 44, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 20, fontWeight: 600, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', padding: 0 }
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', height: 44, borderRadius: 'var(--r-md)', background: 'var(--sem-field)', overflow: 'hidden' }}>
        <button type="button" onClick={onDec} style={mb} aria-label="−">−</button>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} inputMode="numeric"
            className="se-tnum"
            style={{ width: '100%', minWidth: 0, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: big ? 19 : 16, fontWeight: 700, padding: unit ? '0 26px 0 4px' : '0 4px' }} />
          {unit && <span style={{ position: 'absolute', right: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', pointerEvents: 'none' }}>{unit}</span>}
        </div>
        <button type="button" onClick={onInc} style={mb} aria-label="+">+</button>
      </div>
    )
  }
  const btn: React.CSSProperties = {
    width: 38, flexShrink: 0, border: '1px solid var(--se-rule)', background: 'var(--se-card)',
    color: 'var(--se-text)', fontSize: 19, lineHeight: 1, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', padding: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: big ? 46 : 40 }}>
      <button type="button" onClick={onDec} style={{ ...btn, borderRadius: '10px 0 0 10px', borderRight: 'none' }}>−</button>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', borderTop: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', background: 'var(--se-card)' }}>
        <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} inputMode="numeric"
          className="se-fr se-tnum"
          style={{ width: '100%', minWidth: 0, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: big ? 20 : 16, fontWeight: 600, padding: unit ? '0 24px 0 6px' : '0 6px' }} />
        {unit && <span style={{ position: 'absolute', right: 8, fontSize: 10, color: 'var(--se-dim)', pointerEvents: 'none' }}>{unit}</span>}
      </div>
      <button type="button" onClick={onInc} style={{ ...btn, borderRadius: '0 10px 10px 0', borderLeft: 'none' }}>+</button>
    </div>
  )
}
