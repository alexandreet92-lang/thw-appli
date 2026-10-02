'use client'
import { useState } from 'react'
import { rkScope } from './kit/RecordKit'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { useI18n } from '@/lib/i18n'

interface Props { open: boolean; onClose: () => void; isDark: boolean }

function getTheme(_isDark: boolean) {
  // Tokens (clair/sombre portés par le conteneur rkScope de l'écran).
  return {
    bg: 'var(--surface-card)', text: 'var(--text)', label: 'var(--text-mid)', dim: 'var(--text-mid)',
    separator: 'var(--border)', cardBg: 'var(--surface-soft)',
  }
}

export default function RowingSettings({ open, onClose, isDark }: Props) {
  const { t: tr } = useI18n()
  const t = getTheme(isDark)
  const [closing, setClosing] = useState(false)
  const [theme, setTheme] = useState<'auto'|'light'|'dark'>('auto')
  const [unit, setUnit] = useState<'m'|'km'>('m')
  const [autoStrava, setAutoStrava] = useState(false)
  const [showSummary, setShowSummary] = useState(true)
  const { stravaConnected } = useStravaConnection()

  if (!open) return null

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  return (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={handleClose} style={{ position:'absolute', inset:0, background: 'var(--scrim)', animation: closing?'fade-out 200ms ease-in forwards':'fade-in 200ms ease-out forwards' }} />
      <div className={closing?'sheet-close':'sheet-open'} style={{ position:'fixed', left:0, right:0, bottom:0, maxHeight:'70vh', background:t.bg, color:t.text, borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily: 'var(--font-body)', boxShadow:'0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}><div style={{ width:40, height:4, borderRadius:2, background:t.separator }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', flexShrink:0 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0, fontFamily: 'var(--font-display)' }}>{tr('record.rowingSettingsTitle')}</h2>
          <button onClick={handleClose} className="rk-fab rk-press" data-variant="ghost" style={{ width: 36, height: 36 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', paddingBottom:24 }}>
          <SettingsSection title={tr('record.rowingSettingsDisplay')} theme={t}>
            <SettingsRow theme={t} label={tr('record.rowingSettingsTheme')} last
              right={<Select theme={t} value={theme} options={[{value:'auto',label:tr('record.rowingSettingsThemeAuto')},{value:'light',label:tr('record.rowingSettingsThemeLight')},{value:'dark',label:tr('record.rowingSettingsThemeDark')}]} onChange={v => setTheme(v as 'auto'|'light'|'dark')} />} />
          </SettingsSection>
          <SettingsSection title={tr('record.rowingSettingsUnits')} theme={t}>
            <SettingsRow theme={t} label={tr('record.rowingSettingsDistance')} last
              right={<Select theme={t} value={unit} options={[{value:'m',label:tr('record.rowingSettingsMeters')},{value:'km',label:tr('record.rowingSettingsKilometers')}]} onChange={v => setUnit(v as 'm'|'km')} />} />
          </SettingsSection>
          <SettingsSection title={tr('record.rowingSettingsPostSession')} theme={t}>
            <SettingsRow theme={t} label={tr('record.rowingSettingsAutoStrava')} disabled={!stravaConnected}
              right={<Toggle theme={t} value={autoStrava} onChange={setAutoStrava} disabled={!stravaConnected} />} />
            {!stravaConnected && <p style={{ fontSize:12, color:'var(--text-mid)', padding:'4px 16px 8px', margin:0 }}><a href="/connections" style={{ color:'var(--primary)', textDecoration:'none' }}>{tr('record.rowingSettingsConnectStrava')}</a>{tr('record.rowingSettingsConnectStravaSuffix')}</p>}
            <SettingsRow theme={t} label={tr('record.rowingSettingsSummary')} last
              right={<Toggle theme={t} value={showSummary} onChange={setShowSummary} />} />
          </SettingsSection>
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
