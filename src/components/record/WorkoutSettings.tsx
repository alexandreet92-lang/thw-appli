'use client'
import { useState } from 'react'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import { useI18n } from '@/lib/i18n'

interface Props { open: boolean; onClose: () => void; isDark: boolean; sport: 'gym' | 'hyrox' }

function getTheme(isDark: boolean) {
  return { bg: isDark?'#0A0A0A':'#FFFFFF', text: isDark?'#FFFFFF':'#0A0A0A', dim: isDark?'rgba(255,255,255,0.35)':'#8C8C8C', separator: isDark?'rgba(255,255,255,0.08)':'#E8E8E8', cardBg: isDark?'rgba(255,255,255,0.04)':'#FAFAFA' }
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
    <div style={{ position:'fixed', inset:0, zIndex:10000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={handleClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.50)', backdropFilter:'blur(4px)', animation: closing?'fade-out 200ms ease-in forwards':'fade-in 200ms ease-out forwards' }} />
      <div className={closing?'sheet-close':'sheet-open'} style={{ position:'fixed', left:0, right:0, bottom:0, maxHeight:'72vh', background:t.bg, color:t.text, borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'DM Sans, sans-serif', boxShadow:'0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}><div style={{ width:40, height:4, borderRadius:2, background:t.separator }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', flexShrink:0 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0, fontFamily:'Syne, sans-serif' }}>{title}</h2>
          <button onClick={handleClose} style={{ color:t.dim, background:'none', border:'none', fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 8px' }}>×</button>
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
