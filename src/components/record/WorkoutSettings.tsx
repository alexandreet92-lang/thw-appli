'use client'
import { useState } from 'react'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'

interface Props { open: boolean; onClose: () => void; isDark: boolean; sport: 'gym' | 'hyrox' }

function getTheme(isDark: boolean) {
  return { bg: isDark?'#0A0A0A':'#FFFFFF', text: isDark?'#FFFFFF':'#0A0A0A', dim: isDark?'rgba(255,255,255,0.35)':'#8C8C8C', separator: isDark?'rgba(255,255,255,0.08)':'#E8E8E8', cardBg: isDark?'rgba(255,255,255,0.04)':'#FAFAFA' }
}

export default function WorkoutSettings({ open, onClose, isDark, sport }: Props) {
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
  const title = sport === 'gym' ? 'Réglages muscu' : 'Réglages Hyrox'

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
          <SettingsSection title="AFFICHAGE" theme={t}>
            <SettingsRow theme={t} label="Thème" last
              right={<Select theme={t} value={theme} options={[{value:'auto',label:'Auto (jour/nuit)'},{value:'light',label:'Toujours jour'},{value:'dark',label:'Toujours nuit'}]} onChange={v => setTheme(v as 'auto'|'light'|'dark')} />} />
          </SettingsSection>
          <SettingsSection title="UNITÉS" theme={t}>
            <SettingsRow theme={t} label="Poids" last
              right={<Select theme={t} value={weightUnit} options={[{value:'kg',label:'kg'},{value:'lbs',label:'lbs'}]} onChange={v => setWeightUnit(v as 'kg'|'lbs')} />} />
          </SettingsSection>
          <SettingsSection title="COMPORTEMENT" theme={t}>
            <SettingsRow theme={t} label="Repos automatique entre séries"
              right={<Toggle theme={t} value={autoRest} onChange={setAutoRest} />} />
            <SettingsRow theme={t} label="Vibration fin de repos"
              right={<Toggle theme={t} value={vibration} onChange={setVibration} />} />
            <SettingsRow theme={t} label="Bip décompte (3…2…1)" last
              right={<Toggle theme={t} value={countdownBeep} onChange={setCountdownBeep} />} />
          </SettingsSection>
          <SettingsSection title="APRÈS LA SÉANCE" theme={t}>
            <SettingsRow theme={t} label="Résumé en fin de séance" last
              right={<Toggle theme={t} value={showSummary} onChange={setShowSummary} />} />
          </SettingsSection>
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
