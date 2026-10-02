'use client'
// ══════════════════════════════════════════════════════════════════════════
// Enregistrer le parcours — feuille du bas du kit record : résumé (distance ·
// D+ · durée · sport), nom, usage (Entraînement / Compétition, segmenté),
// visibilité (deux lignes sélectionnables) et pilule cyan « Enregistrer ».
// Les options « Synchroniser avec les autres apps » / « Télécharger hors
// ligne » ne sont branchées à rien : masquées tant qu'elles ne le sont pas.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { RkSheet, RkCta, RkIco, RK_ICON, useSheetClose } from './kit/RecordKit'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'

export type RouteType = 'training' | 'race'

function fmtDur(sec: number): string { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min` }

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
  const [open, close] = useSheetClose(onClose)
  const [isPublic, setIsPublic] = useState(false)
  const [routeType, setRouteType] = useState<RouteType>(initialType)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving) return
    haptic('medium')
    setSaving(true)
    await onSave(routeName || t('record.routeSaveDefaultName'), isPublic, routeType)
    setSaving(false)
  }

  const summary = [
    distanceM > 0 ? `${(distanceM / 1000).toFixed(1).replace('.', ',')} km` : null,
    `${Math.round(elevGain)} m D+`,
    durationSec > 0 ? fmtDur(durationSec) : null,
    sportLabel ?? null,
  ].filter(Boolean).join(' · ')

  const label = (txt: string) => (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', margin: '18px 4px 8px' }}>{txt}</div>
  )

  // Ligne de visibilité sélectionnable (anneau cyan = choisie).
  const visRow = (on: boolean, onClick: () => void, title: string, desc: string, icon: React.ReactNode) => (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-pressed={on} className="rk-press"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: 8,
        borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', background: 'var(--surface-card)', color: 'var(--text)',
        boxShadow: on ? 'inset 0 0 0 2px var(--primary)' : 'var(--shadow-capsule)',
        transition: 'box-shadow 200ms ease',
      }}>
      <span style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-chip)', color: on ? 'var(--primary)' : 'var(--text-mid)' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{desc}</span>
      </span>
      <span aria-hidden style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--primary)' : 'transparent', color: 'var(--on-primary)',
        boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)',
      }}>
        {on && <RkIco d={RK_ICON.check} size={14} sw={3} />}
      </span>
    </button>
  )

  return (
    <RkSheet open={open} onClose={close} title={t('record.routeSaveTitle')} sub={summary} isDark={isDark} zIndex={20000}
      footer={
        <RkCta variant="primary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? t('record.routeSaveSaving') : t('record.routeSaveTitle')}
        </RkCta>
      }>
      {label(t('record.routeSaveNameLabel'))}
      <input
        className="rk-field"
        value={routeName}
        onChange={e => onChangeName(e.target.value)}
        placeholder={t('record.routeSaveNamePlaceholder')}
        aria-label={t('record.routeSaveNameLabel')}
        enterKeyHint="done"
        style={{ fontSize: 16, minHeight: 52, background: 'var(--surface-card)' }}
      />

      {label(t('record.routeSaveUsageLabel'))}
      <div className="rk-seg">
        <button type="button" aria-pressed={routeType === 'training'} onClick={() => { haptic('light'); setRouteType('training') }}>{t('record.routeSaveUsageTraining')}</button>
        <button type="button" aria-pressed={routeType === 'race'} onClick={() => { haptic('light'); setRouteType('race') }}>{t('record.routeSaveUsageRace')}</button>
      </div>

      {label(t('record.routeSaveVisibilityLabel'))}
      {visRow(isPublic, () => setIsPublic(true), t('record.routeSaveVisibilityEveryone'), t('record.routeSavePublic'), <RkIco d={RK_ICON.globe} size={19} />)}
      {visRow(!isPublic, () => setIsPublic(false), t('record.routeSaveVisibilityOnlyYou'), t('record.routeSavePrivate'), <RkIco d={RK_ICON.lock} size={18} />)}
    </RkSheet>
  )
}
