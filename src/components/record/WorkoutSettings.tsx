'use client'
import { useState } from 'react'
import { rkScope } from './kit/RecordKit'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import { useI18n } from '@/lib/i18n'

interface Props { open: boolean; onClose: () => void; isDark: boolean; sport: 'gym' | 'hyrox' }

function getTheme(_isDark: boolean) {
  // Tokens (clair/sombre via rkScope sur la racine) — feuille blanche, listes
  // groupées grises façon iOS (maquette r1, feuille dépliée).
  return {
    bg: 'var(--surface-card)', text: 'var(--text)', label: 'var(--text-mid)', dim: 'var(--text-mid)',
    separator: 'var(--border)', cardBg: 'var(--surface-soft)',
  }
}

export default function WorkoutSettings({ open, onClose, isDark, sport }: Props) {
  const { t: tr } = useI18n()
  const t = getTheme(isDark)
  const [closing, setClosing] = useState(false)
  const [theme, setTheme] = useState<'auto'|'light'|'dark'>('auto')
  const [weightUnit, setWeightUnit] = useState<'kg'|'lbs'>('kg')
  const [autoRest, setAutoRest] = useState(true)
  const [vibration, setVibration] = useState(true)
  const [showSummary, setShowSummary] = useState(true)
  const [countdownBeep, setCountdownBeep] = useState(false)

  if (!open) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const title = sport === 'gym' ? tr('record.workoutSettingsTitleGym') : tr('record.workoutSettingsTitleHyrox')

  return (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={handleClose} style={{ position:'absolute', inset:0, background: 'var(--scrim)', animation: closing?'fade-out 200ms ease-in forwards':'fade-in 200ms ease-out forwards' }} />
      <div className={closing?'sheet-close':'sheet-open'} style={{ position:'fixed', left:0, right:0, bottom:0, maxHeight:'72vh', background:t.bg, color:t.text, borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily: 'var(--font-body)', boxShadow:'var(--shadow-float)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}><div style={{ width:40, height:4, borderRadius:2, background:t.separator }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', flexShrink:0 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0, fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button onClick={handleClose} className="rk-fab rk-press" data-variant="ghost" style={{ width: 36, height: 36 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', paddingBottom:24 }}>
          <SettingsSection title={tr('record.settingsSec_display')} theme={t}>
            <SettingsRow theme={t} label={tr('record.workoutSettingsTheme')} last
              right={<Select theme={t} value={theme} options={[{value:'auto',label:tr('record.workoutThemeAuto')},{value:'light',label:tr('record.workoutThemeAlwaysLight')},{value:'dark',label:tr('record.workoutThemeAlwaysDark')}]} onChange={v => setTheme(v as 'auto'|'light'|'dark')} />} />
          </SettingsSection>
          <SettingsSection title={tr('record.settingsSec_units')} theme={t}>
            <SettingsRow theme={t} label={tr('record.workoutSettingsWeight')} last
              right={<Select theme={t} value={weightUnit} options={[{value:'kg',label:'kg'},{value:'lbs',label:'lbs'}]} onChange={v => setWeightUnit(v as 'kg'|'lbs')} />} />
          </SettingsSection>
          <SettingsSection title={tr('record.workoutSettingsBehavior')} theme={t}>
            <SettingsRow theme={t} label={tr('record.workoutSettingsAutoRest')}
              right={<Toggle theme={t} value={autoRest} onChange={setAutoRest} />} />
            <SettingsRow theme={t} label={tr('record.workoutSettingsVibration')}
              right={<Toggle theme={t} value={vibration} onChange={setVibration} />} />
            <SettingsRow theme={t} label={tr('record.workoutSettingsCountdownBeep')} last
              right={<Toggle theme={t} value={countdownBeep} onChange={setCountdownBeep} />} />
          </SettingsSection>
          <SettingsSection title={tr('record.settingsSec_postrun')} theme={t}>
            <SettingsRow theme={t} label={tr('record.workoutSettingsShowSummary')} last
              right={<Toggle theme={t} value={showSummary} onChange={setShowSummary} />} />
          </SettingsSection>
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
