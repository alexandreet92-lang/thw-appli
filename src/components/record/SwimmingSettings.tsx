'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SwimmingSettings({ open, onClose }: Props) {
  const { t } = useI18n()
  const [unit, setUnit] = useState<'m' | 'yd'>('m')
  const [autoStrava, setAutoStrava] = useState(false)
  const [showSummary, setShowSummary] = useState(true)
  const [closing, setClosing] = useState(false)

  useEffect(() => { if (open) setClosing(false) }, [open])
  if (!open) return null

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  const Row = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 15, color: 'var(--text)' }}>{label}</span>
      <button
        onClick={onToggle}
        style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#06B6D4' : 'var(--bg-card2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
      </button>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}>
      <div
        onClick={handleClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', animation: `${closing ? 'fade-out' : 'fade-in'} 200ms forwards` }}
      />
      <div
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{ position: 'relative', width: '100%', background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, fontFamily: 'DM Sans, sans-serif', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{t('record.swimSettingsTitle')}</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 10px' }}>{t('record.swimSettingsUnits')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['m', 'yd'] as const).map(u => (
                <button key={u} onClick={() => setUnit(u)} style={{ padding: '8px 20px', borderRadius: 9999, border: unit === u ? 'none' : '1px solid var(--border)', background: unit === u ? 'linear-gradient(135deg, #06B6D4, #2563EB)' : 'transparent', color: unit === u ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{u}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>{t('record.swimSettingsPostSession')}</p>
            <Row label={t('record.swimSettingsUploadStrava')} value={autoStrava} onToggle={() => setAutoStrava(v => !v)} />
            <Row label={t('record.settingsShowSummary')} value={showSummary} onToggle={() => setShowSummary(v => !v)} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  )
}
