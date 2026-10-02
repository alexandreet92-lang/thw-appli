'use client'
// ════════════════════════════════════════════════════════════════════
// ExitSheet — feuille de sortie pendant l'enregistrement (spec §6).
// « Enregistrement en cours » · durée + distance · Reprendre (aussi tap hors
// feuille / glisser vers le bas) · Terminer et sauvegarder · Supprimer
// l'activité en DEUX TEMPS (1er tap → confirmation rouge 3 s, 2e tap exécute).
// Aucun alert()/confirm(). Langage visuel : RecordKit (feuille premium).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { formatHMS, frNum } from './liveMachine'
import { RkSheet, RkCta } from '../kit/RecordKit'

interface Props {
  open: boolean
  durationSec: number
  distanceM: number
  onResume: () => void
  onFinish: () => void
  onDelete: () => void
  isDark?: boolean
}

export default function ExitSheet({ open, durationSec, distanceM, onResume, onFinish, onDelete, isDark }: Props) {
  const { t } = useI18n()
  const [armed, setArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disarm = () => {
    setArmed(false)
    if (armTimer.current) { clearTimeout(armTimer.current); armTimer.current = null }
  }

  useEffect(() => {
    if (!open) disarm()
    return () => { if (armTimer.current) clearTimeout(armTimer.current) }
  }, [open])

  const handleDelete = () => {
    if (!armed) {
      haptic('medium')
      setArmed(true)
      armTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    haptic('heavy')
    disarm()
    onDelete()
  }

  const km = frNum(distanceM / 1000, 1)

  return (
    <RkSheet open={open} onClose={() => { disarm(); onResume() }} isDark={isDark} zIndex={10070} label={t('rec.exitTitle')}>
      <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{t('rec.exitTitle')}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '8px 0 22px', fontWeight: 500 }}>
          <span className="rk-num" style={{ letterSpacing: 0, fontWeight: 700, color: 'var(--text)' }}>{formatHMS(durationSec, true)} · {km} km</span>
          {' — '}{t('rec.exitUnsaved')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RkCta variant="primary" onClick={() => { disarm(); onResume() }}>{t('w2c.resume')}</RkCta>
          <RkCta variant="white" onClick={() => { disarm(); onFinish() }}>{t('rec.finishAndSave')}</RkCta>
          <RkCta variant={armed ? 'danger' : 'text-danger'} onClick={handleDelete} style={{ marginTop: 4 }}>
            {armed ? t('w3a.confirm_delete', { dist: km, unit: 'km' }) : t('w3a.delete_activity')}
          </RkCta>
        </div>
      </div>
    </RkSheet>
  )
}
