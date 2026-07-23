'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

export type RouteType = 'training' | 'race'

interface Props {
  routeName: string
  onChangeName: (n: string) => void
  onSave: (name: string, isPublic: boolean, routeType: RouteType) => Promise<void>
  onClose: () => void
  isDark: boolean
  initialType?: RouteType
}

export default function RouteSaveForm({ routeName, onChangeName, onSave, onClose, isDark, initialType = 'training' }: Props) {
  const { t } = useI18n()
  const [isPublic, setIsPublic] = useState(false)
  const [routeType, setRouteType] = useState<RouteType>(initialType)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const close = () => { setClosing(true); setTimeout(onClose, 200) }

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

  // Segmented control réutilisable (type d'usage + confidentialité).
  const seg = <T,>(value: T, current: T, set: (v: T) => void, txt: string) => (
    <button key={String(value)} onClick={() => set(value)}
      style={{ flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-body)',
        background: current === value ? 'var(--primary-dim, rgba(6,182,212,0.14))' : surface,
        border: `1.5px solid ${current === value ? '#06B6D4' : 'transparent'}`,
        color: current === value ? '#06B6D4' : text, transition: 'background 0.14s, border-color 0.14s' }}>
      {txt}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{`
        @keyframes rsfIn { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes rsfOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.97); } }
      `}</style>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', width: 'min(440px, 100%)', background: bg, borderRadius: 20, border: `1px solid ${border}`, padding: '22px 22px 20px',
        boxShadow: '0 24px 70px rgba(0,0,0,0.35)', fontFamily: 'var(--font-body)', animation: `${closing ? 'rsfOut 0.2s ease forwards' : 'rsfIn 0.22s cubic-bezier(0.2,0.8,0.2,1)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0, fontFamily: 'var(--font-display)' }}>{t('record.routeSaveTitle')}</p>
          <button onClick={close} aria-label={t('record.routeCreatorClose')} style={{ width: 30, height: 30, borderRadius: '50%', background: surface, border: 'none', color: mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Nom */}
        <p style={label}>{t('record.routeSaveNameLabel')}</p>
        <input
          value={routeName}
          onChange={e => onChangeName(e.target.value)}
          placeholder={t('record.routeSaveNamePlaceholder')}
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', fontSize: 15, color: text, outline: 'none', fontFamily: 'var(--font-body)', marginBottom: 18 }}
        />

        {/* Type d'usage : Entraînement / Compétition */}
        <p style={label}>{t('record.routeSaveUsageLabel')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {seg<RouteType>('training', routeType, setRouteType, t('record.routeSaveUsageTraining'))}
          {seg<RouteType>('race', routeType, setRouteType, t('record.routeSaveUsageRace'))}
        </div>

        {/* Confidentialité */}
        <p style={label}>{t('record.routeSavePrivacyLabel')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {seg<boolean>(false, isPublic, setIsPublic, t('record.routeSavePrivate'))}
          {seg<boolean>(true, isPublic, setIsPublic, t('record.routeSavePublic'))}
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', height: 48, borderRadius: 14, background: saving ? 'var(--bg-card2, #E5E7EB)' : 'var(--primary, #06B6D4)', border: 'none', color: saving ? mid : 'var(--on-primary, #fff)', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
          {saving ? t('record.routeSaveSaving') : t('record.routeSaveTitle')}
        </button>
      </div>
    </div>
  )
}
