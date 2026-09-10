'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

export type RouteType = 'training' | 'race'

const SAVE_BLUE = '#2563EB'
function fmtDur(sec: number): string { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }

interface Props {
  routeName: string
  onChangeName: (n: string) => void
  onSave: (name: string, isPublic: boolean, routeType: RouteType) => Promise<void>
  onClose: () => void
  isDark: boolean
  initialType?: RouteType
  distanceM?: number
  elevGain?: number
  durationSec?: number
  sportLabel?: string
}

export default function RouteSaveForm({ routeName, onChangeName, onSave, onClose, isDark, initialType = 'training', distanceM = 0, elevGain = 0, durationSec = 0, sportLabel }: Props) {
  const { t } = useI18n()
  const [isPublic, setIsPublic] = useState(false)
  const [routeType, setRouteType] = useState<RouteType>(initialType)
  const [syncApps, setSyncApps] = useState(false)
  const [offline, setOffline] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const close = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }

  const bg = isDark ? '#0F1117' : '#FFFFFF'
  const text = isDark ? '#EEF2F7' : '#0A0A0A'
  const mid = isDark ? 'rgba(238,242,247,0.6)' : '#6B7280'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F7F8FA'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    await onSave(routeName || t('record.routeSaveDefaultName'), isPublic, routeType)
    setSaving(false)
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: mid, margin: '0 0 8px' }

  // Segmented control réutilisable (type d'usage).
  const seg = <T,>(value: T, current: T, set: (v: T) => void, txt: string) => (
    <button key={String(value)} onClick={() => set(value)}
      style={{ flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-body)',
        background: current === value ? 'rgba(37,99,235,0.12)' : surface,
        border: `1.5px solid ${current === value ? SAVE_BLUE : 'transparent'}`,
        color: current === value ? SAVE_BLUE : text, transition: 'background 0.14s, border-color 0.14s' }}>
      {txt}
    </button>
  )

  // Ligne de choix « radio » (Qui peut voir cet itinéraire ?).
  const radioRow = (on: boolean, onClick: () => void, title: string, desc: string, icon: React.ReactNode) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, cursor: 'pointer',
      background: on ? 'rgba(37,99,235,0.10)' : surface, border: `1.5px solid ${on ? SAVE_BLUE : 'transparent'}`, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
      <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? SAVE_BLUE : (isDark ? 'rgba(255,255,255,0.08)' : '#EDF0F3'), color: on ? '#fff' : mid }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: on ? SAVE_BLUE : text }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: mid, marginTop: 1 }}>{desc}</span>
      </span>
      <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? SAVE_BLUE : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: SAVE_BLUE }} />}
      </span>
    </button>
  )

  // Interrupteur (toggle) réutilisable.
  const toggleRow = (on: boolean, onToggle: () => void, title: string, icon: React.ReactNode) => (
    <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: surface, color: mid }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: text }}>{title}</span>
      <span style={{ width: 44, height: 26, borderRadius: 999, flexShrink: 0, background: on ? SAVE_BLUE : (isDark ? 'rgba(255,255,255,0.18)' : '#D1D5DB'), position: 'relative', transition: 'background 0.18s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.18s' }} />
      </span>
    </button>
  )

  const stats = [
    { label: t('record.routeCreatorDistance'), value: distanceM > 0 ? `${(distanceM / 1000).toFixed(2)}` : '--', unit: 'km' },
    { label: 'D+', value: `${Math.round(elevGain)}`, unit: 'm' },
    { label: t('record.routeCreatorEstDuration'), value: durationSec > 0 ? fmtDur(durationSec) : '--', unit: '' },
  ]

  const panel: React.CSSProperties = isNarrow
    ? { position: 'relative', width: '100%', maxHeight: '94vh', overflowY: 'auto', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -10px 50px rgba(0,0,0,0.35)', padding: '10px 20px calc(24px + env(safe-area-inset-bottom))', fontFamily: 'var(--font-body)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)' }
    : { position: 'relative', width: 'min(460px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: bg, borderRadius: 20, border: `1px solid ${border}`, padding: '22px 22px 20px', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', fontFamily: 'var(--font-body)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(24px)', opacity: shown && !closing ? 1 : 0, transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center', padding: isNarrow ? 0 : 16 }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={panel}>
        {isNarrow && <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}><span style={{ width: 40, height: 4, borderRadius: 2, background: border }} /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: text, margin: 0, fontFamily: 'var(--font-display)' }}>{t('record.routeSaveTitle')}</p>
          <button onClick={close} aria-label={t('record.routeCreatorClose')} style={{ width: 30, height: 30, borderRadius: '50%', background: surface, border: 'none', color: mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Résumé : distance · dénivelé · temps (+ sport) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 14, background: surface, border: `1px solid ${border}`, marginBottom: 18 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? `1px solid ${border}` : 'none' }}>
              <p style={{ fontSize: 9.5, color: mid, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: text, margin: '3px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}{s.unit && <span style={{ fontSize: 10.5, fontWeight: 600, color: mid }}> {s.unit}</span>}</p>
            </div>
          ))}
        </div>
        {sportLabel && <p style={{ fontSize: 12.5, color: mid, margin: '-8px 0 18px', textAlign: 'center' }}>{sportLabel}</p>}

        {/* Nom */}
        <p style={label}>{t('record.routeSaveNameLabel')}</p>
        <input
          value={routeName}
          onChange={e => onChangeName(e.target.value)}
          placeholder={t('record.routeSaveNamePlaceholder')}
          autoFocus={!isNarrow}
          style={{ width: '100%', boxSizing: 'border-box', background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '13px 14px', fontSize: 15, color: text, outline: 'none', fontFamily: 'var(--font-body)', marginBottom: 18 }}
        />

        {/* Type d'usage : Entraînement / Compétition */}
        <p style={label}>{t('record.routeSaveUsageLabel')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {seg<RouteType>('training', routeType, setRouteType, t('record.routeSaveUsageTraining'))}
          {seg<RouteType>('race', routeType, setRouteType, t('record.routeSaveUsageRace'))}
        </div>

        {/* Qui peut voir cet itinéraire ? */}
        <p style={label}>{t('record.routeSaveVisibilityLabel')}</p>
        {radioRow(isPublic, () => setIsPublic(true), t('record.routeSaveVisibilityEveryone'), t('record.routeSavePublic'),
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>)}
        {radioRow(!isPublic, () => setIsPublic(false), t('record.routeSaveVisibilityOnlyYou'), t('record.routeSavePrivate'),
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>)}

        {/* Options supplémentaires */}
        <div style={{ marginTop: 12, marginBottom: 20, borderTop: `1px solid ${border}`, paddingTop: 6 }}>
          {toggleRow(syncApps, () => setSyncApps(v => !v), t('record.routeSaveSyncApps'),
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>)}
          {toggleRow(offline, () => setOffline(v => !v), t('record.routeSaveOffline'),
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>)}
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 15, background: saving ? surface : SAVE_BLUE, border: 'none', color: saving ? mid : '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: saving ? 'none' : '0 4px 16px rgba(37,99,235,0.34)' }}>
          {saving ? t('record.routeSaveSaving') : t('record.routeSaveTitle')}
        </button>
      </div>
    </div>
  )
}
