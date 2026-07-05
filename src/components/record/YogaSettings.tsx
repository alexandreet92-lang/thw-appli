'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props { open: boolean; onClose: () => void; isDark: boolean; aiTipsEnabled: boolean; onToggleAI: (v: boolean) => void }

export default function YogaSettings({ open, onClose, isDark, aiTipsEnabled, onToggleAI }: Props) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)
  if (!open) return null
  const bg   = isDark ? '#111' : '#FFF'
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const handleClose = () => { setClosing(true); setTimeout(onClose, 220) }

  function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${sep}` }}>
        <div>
          <p style={{ fontSize: 15, color: text, margin: 0 }}>{label}</p>
          {sub && <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>{sub}</p>}
        </div>
        {children}
      </div>
    )
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, background: value ? '#06B6D4' : (isDark ? 'rgba(255,255,255,0.15)' : '#D1D5DB'), cursor: 'pointer', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#FFF', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', animation: closing ? 'yogaset-out 200ms ease-in forwards' : 'yogaset-in 200ms ease-out forwards' }} />
      <div style={{ position: 'relative', width: '100%', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'env(safe-area-inset-bottom)', animation: closing ? 'sheet-close-anim 200ms ease-in forwards' : 'sheet-open-anim 220ms cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: dim }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0, fontFamily: 'Syne, sans-serif' }}>{t('record.yogaSettingsTitle')}</p>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: dim, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 20px 6px', margin: 0 }}>{t('record.yogaSettingsAiTips')}</p>
        <Row label={t('record.yogaSettingsAiDuring')} sub={t('record.yogaSettingsAiDuringSub')}>
          <Toggle value={aiTipsEnabled} onChange={onToggleAI} />
        </Row>
        <p style={{ fontSize: 11, fontWeight: 700, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 20px 6px', margin: 0 }}>{t('record.yogaSettingsPostSession')}</p>
        <Row label={t('record.yogaSettingsShowSummary')} sub={t('record.yogaSettingsShowSummarySub')}>
          <Toggle value={true} onChange={() => {}} />
        </Row>
        <div style={{ height: 20 }} />
      </div>
      <style>{`
        @keyframes yogaset-in  { from{opacity:0} to{opacity:1} }
        @keyframes yogaset-out { from{opacity:1} to{opacity:0} }
        @keyframes sheet-open-anim { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes sheet-close-anim{ from{transform:translateY(0)} to{transform:translateY(100%)} }
      `}</style>
    </div>
  )
}
