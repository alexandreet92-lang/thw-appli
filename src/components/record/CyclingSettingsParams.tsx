'use client'
import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { SettingsSection, SettingsSectionSubtitle } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import { NumberInput } from './settings/NumberInput'
import type { ThemeColors } from './settings/types'
import type { CyclingSettings } from '@/hooks/useCyclingSettings'
import { FONT_OPTIONS } from '@/types/cycling'

interface Props {
  settings: CyclingSettings
  updateSetting: (path: string, value: unknown) => void
  theme: ThemeColors
  section?: string
}

const ZONE_COLORS = ['', '#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']
const ZONE_LABELS = ['', 'Récupération', 'Endurance', 'Tempo', 'Seuil', 'VO2max']

interface BikeZones {
  ftp_watts: number | null
  z1_value: string; z2_value: string; z3_value: string
  z4_value: string; z5_value: string
}

const sensor = { hr: false, power: false, cadence: false }

export default function CyclingSettingsParams({ settings, updateSetting, theme, section }: Props) {
  const { profile } = useProfile()
  const al = settings.alerts
  const di = settings.display
  const at = settings.athlete
  const re = settings.recording
  const un = settings.units
  const po = settings.postRide

  const [stravaConnected, setStravaConnected] = useState(false)
  const [bikeZones, setBikeZones] = useState<BikeZones | null>(null)

  useEffect(() => {
    fetch('/api/strava/connected')
      .then(r => r.json())
      .then(d => setStravaConnected(!!d.connected))
      .catch(() => {})
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('training_zones')
          .select('ftp_watts,z1_value,z2_value,z3_value,z4_value,z5_value')
          .eq('user_id', user.id).eq('sport', 'bike').eq('is_current', true)
          .maybeSingle()
        if (data) setBikeZones(data as BikeZones)
      } catch { /* zones not set yet */ }
    })()
  }, [])

  const renderAlerts = () => (
    <SettingsSection title="NOTIFICATIONS & ALERTES" theme={theme}>
      <SettingsSectionSubtitle label="Alertes système" theme={theme} />
      <SettingsRow theme={theme} label="Alerte GPS perdu" description="Vibration et message si le signal GPS est coupé"
        right={<Toggle theme={theme} value={al.gpsLost} onChange={v => updateSetting('alerts.gpsLost', v)} />} />
      <SettingsSectionSubtitle label="Fréquence cardiaque" badge="Capteur requis" theme={theme} />
      <SettingsRow theme={theme} label="Alerte zone FC" description="Notifie quand tu entres ou sors d'une zone FC"
        disabled={!sensor.hr}
        right={<Toggle theme={theme} value={al.hrZone} onChange={v => updateSetting('alerts.hrZone', v)} disabled={!sensor.hr} />} />
      <SettingsRow theme={theme} label="Seuil FC max" description="Alerte si tu dépasses ce seuil" disabled={!sensor.hr}
        right={<NumberInput theme={theme} value={al.hrMaxThreshold} min={100} max={220} step={5} unit="bpm" onChange={v => updateSetting('alerts.hrMaxThreshold', v)} disabled={!sensor.hr} />} />
      <SettingsSectionSubtitle label="Puissance" badge="Capteur requis" theme={theme} />
      <SettingsRow theme={theme} label="Seuil watts haut" description="Alerte si tu dépasses ce seuil" disabled={!sensor.power}
        right={<NumberInput theme={theme} value={al.powerHighThreshold} min={50} max={600} step={10} unit="w" onChange={v => updateSetting('alerts.powerHighThreshold', v)} disabled={!sensor.power} />} />
      <SettingsRow theme={theme} label="Seuil watts bas" description="Alerte si tu descends sous ce seuil" disabled={!sensor.power}
        right={<NumberInput theme={theme} value={al.powerLowThreshold} min={50} max={600} step={10} unit="w" onChange={v => updateSetting('alerts.powerLowThreshold', v)} disabled={!sensor.power} />} />
      <SettingsSectionSubtitle label="Rappels effort" theme={theme} />
      <SettingsRow theme={theme} label="Rappel hydratation"
        right={<Select theme={theme} value={al.hydrationInterval} options={[{value:0,label:'Désactivé'},{value:15,label:'15 min'},{value:20,label:'20 min'},{value:30,label:'30 min'},{value:45,label:'45 min'}]} onChange={v => updateSetting('alerts.hydrationInterval', Number(v))} />} />
      <SettingsRow theme={theme} label="Rappel nutrition"
        right={<Select theme={theme} value={al.nutritionInterval} options={[{value:0,label:'Désactivé'},{value:20,label:'20 min'},{value:30,label:'30 min'},{value:45,label:'45 min'},{value:60,label:'60 min'}]} onChange={v => updateSetting('alerts.nutritionInterval', Number(v))} />} />
      <SettingsSectionSubtitle label="Format des alertes" theme={theme} />
      <SettingsRow theme={theme} label="Vibration"
        right={<Toggle theme={theme} value={al.vibration} onChange={v => updateSetting('alerts.vibration', v)} />} />
      <SettingsRow theme={theme} label="Son" last
        right={<Toggle theme={theme} value={al.sound} onChange={v => updateSetting('alerts.sound', v)} />} />
    </SettingsSection>
  )

  const renderSensors = () => (
    <SettingsSection title="CAPTEURS" theme={theme}>
      <div style={{ padding: '10px 16px 14px', background: 'rgba(6,182,212,0.06)', borderBottom: `1px solid ${theme.separator}` }}>
        <p style={{ fontSize: 12, color: '#06B6D4', margin: 0, lineHeight: 1.5 }}>La connexion Bluetooth sera disponible lors du lancement sur l&apos;App Store.</p>
      </div>
      {[
        { id:'hr',      label:'Fréquence cardiaque', desc:'Ceinture ou bracelet ANT+/BLE' },
        { id:'power',   label:'Capteur de puissance', desc:'Pédalier ou manivelle BLE' },
        { id:'cadence', label:'Cadence',              desc:'Capteur de pédalage BLE' },
        { id:'speed',   label:'Vitesse roue',         desc:'Capteur de vitesse BLE' },
      ].map((s, i, arr) => (
        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i < arr.length-1 ? `1px solid ${theme.separator}` : 'none' }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15, color:theme.text, margin:0 }}>{s.label}</p>
            <p style={{ fontSize:12, color:'#8C8C8C', margin:'2px 0 0' }}>{s.desc}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#8C8C8C' }}>Non connecté</span>
            <span style={{ fontSize:10, color:'#06B6D4', border:'1px solid rgba(6,182,212,0.4)', borderRadius:20, padding:'2px 8px' }}>Bientôt</span>
          </div>
        </div>
      ))}
    </SettingsSection>
  )

  const renderDisplay = () => (
    <SettingsSection title="AFFICHAGE" theme={theme}>
      <SettingsRow theme={theme} label="Garder l'écran allumé" description="Empêche la mise en veille pendant la séance"
        right={<Toggle theme={theme} value={di.keepAwake} onChange={v => { updateSetting('display.keepAwake', v); if (v && 'wakeLock' in navigator) { (navigator as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request('screen').catch(() => {}) } }} />} />
      <SettingsRow theme={theme} label="Thème compteur"
        right={<Select theme={theme} value={di.theme} options={[{value:'auto',label:'Auto (jour/nuit)'},{value:'light',label:'Toujours jour'},{value:'dark',label:'Toujours nuit'}]} onChange={v => updateSetting('display.theme', v)} />} />
      <SettingsRow theme={theme} label="Taille des données"
        right={<Select theme={theme} value={di.dataSize} options={[{value:'small',label:'Petite'},{value:'normal',label:'Normale'},{value:'large',label:'Grande'}]} onChange={v => updateSetting('display.dataSize', v)} />} />
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.separator}` }}>
        <p style={{ fontSize: 15, color: theme.text, margin: '0 0 12px' }}>Police des données</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FONT_OPTIONS.map(font => {
            const active = (di.dataFont ?? 'system') === font.id
            return (
              <button key={font.id} onClick={() => updateSetting('display.dataFont', font.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: active ? 'rgba(6,182,212,0.08)' : 'transparent',
                  border: `1.5px solid ${active ? '#06B6D4' : theme.separator}`,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                <span style={{ fontSize: 14, color: theme.text, fontWeight: 500 }}>{font.label}</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: active ? '#06B6D4' : theme.text, fontFamily: font.fontFamily, letterSpacing: '-0.5px' }}>28.4</span>
              </button>
            )
          })}
        </div>
      </div>
    </SettingsSection>
  )

  const renderAthlete = () => (
    <SettingsSection title="PROFIL ATHLÈTE" theme={theme}>
      <div style={{ padding: '8px 16px 4px' }}>
        <p style={{ fontSize: 12, color: '#8C8C8C', margin: 0 }}>Ces valeurs sont utilisées pour calculer les zones, le TSS et l&apos;IF.</p>
      </div>
      <SettingsRow theme={theme} label="FTP" description="Puissance seuil fonctionnel · Utilisé pour calculer les zones"
        right={<NumberInput theme={theme} value={at.ftp} min={50} max={600} step={5} unit="w" onChange={v => updateSetting('athlete.ftp', v)} />} />
      <SettingsRow theme={theme} label="FC max" description="Utilisée pour calculer les zones FC"
        right={<NumberInput theme={theme} value={at.maxHr} min={100} max={220} step={1} unit="bpm" onChange={v => updateSetting('athlete.maxHr', v)} />} />
      <SettingsRow theme={theme} label="FC repos"
        right={<NumberInput theme={theme} value={at.restHr} min={30} max={100} step={1} unit="bpm" onChange={v => updateSetting('athlete.restHr', v)} />} />
      <SettingsRow theme={theme} label="Poids" description="Synchronisé avec ton profil" last
        right={<span style={{ fontSize: 14, color: '#8C8C8C' }}>{profile?.weight_kg ?? '—'} kg</span>} />

      {/* Zones de puissance cyclisme */}
      <div style={{ padding: '12px 16px 4px', marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: theme.dim, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Zones de puissance</p>
      </div>
      {bikeZones ? (
        <div>
          {([1,2,3,4,5] as const).map(z => {
            const val = bikeZones[`z${z}_value` as keyof BikeZones] as string
            if (!val) return null
            return (
              <div key={z} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid ${theme.separator}` }}>
                <div style={{ width:28, height:28, borderRadius:8, background: ZONE_COLORS[z], display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>Z{z}</div>
                <span style={{ flex:1, fontSize:14, color:theme.text }}>{ZONE_LABELS[z]}</span>
                <span style={{ fontSize:13, color:'#8C8C8C' }}>{val} w</span>
              </div>
            )
          })}
          {bikeZones.ftp_watts && (
            <div style={{ padding:'10px 16px', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:theme.dim }}>FTP de référence</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#06B6D4' }}>{bikeZones.ftp_watts} w</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding:'12px 16px 16px' }}>
          <p style={{ fontSize:13, color:'#8C8C8C', fontStyle:'italic', margin:0 }}>
            Aucune zone configurée.{' '}
            <a href="/performance" style={{ color:'#06B6D4', textDecoration:'none' }}>Configurer dans Performance</a>
          </p>
        </div>
      )}
    </SettingsSection>
  )

  const renderRecording = () => (
    <SettingsSection title="ENREGISTREMENT" theme={theme}>
      <SettingsRow theme={theme} label="Fréquence GPS"
        right={<Select theme={theme} value={re.gpsFrequency} options={[{value:1,label:'1 seconde'},{value:5,label:'5 secondes'},{value:'auto',label:'Auto'}]} onChange={v => updateSetting('recording.gpsFrequency', v === 'auto' ? 'auto' : Number(v))} />} />
      <SettingsRow theme={theme} label="Auto-pause" description="Arrête le chrono si vitesse inférieure au seuil"
        right={<Toggle theme={theme} value={re.autoPause} onChange={v => updateSetting('recording.autoPause', v)} />} />
      <SettingsRow theme={theme} label="Seuil auto-pause" disabled={!re.autoPause}
        right={<Select theme={theme} value={re.autoPauseThreshold} options={[{value:3,label:'3 km/h'},{value:5,label:'5 km/h'},{value:10,label:'10 km/h'}]} onChange={v => updateSetting('recording.autoPauseThreshold', Number(v))} disabled={!re.autoPause} />} />
      <SettingsRow theme={theme} label="Auto-lap" last
        right={<Select theme={theme} value={re.autoLap} options={[{value:0,label:'Désactivé'},{value:1,label:'1 km'},{value:5,label:'5 km'},{value:10,label:'10 km'},{value:20,label:'20 km'}]} onChange={v => updateSetting('recording.autoLap', Number(v))} />} />
    </SettingsSection>
  )

  const renderUnits = () => (
    <SettingsSection title="UNITÉS & MESURES" theme={theme}>
      <SettingsRow theme={theme} label="Distance & Vitesse"
        right={<Select theme={theme} value={un.distance} options={[{value:'metric',label:'km / km/h'},{value:'imperial',label:'miles / mph'}]} onChange={v => updateSetting('units.distance', v)} />} />
      <SettingsRow theme={theme} label="Altitude"
        right={<Select theme={theme} value={un.altitude} options={[{value:'m',label:'Mètres'},{value:'ft',label:'Pieds'}]} onChange={v => updateSetting('units.altitude', v)} />} />
      <SettingsRow theme={theme} label="Température"
        right={<Select theme={theme} value={un.temperature} options={[{value:'c',label:'Celsius (°C)'},{value:'f',label:'Fahrenheit (°F)'}]} onChange={v => updateSetting('units.temperature', v)} />} />
      <SettingsRow theme={theme} label="Poids" last
        right={<Select theme={theme} value={un.weight} options={[{value:'kg',label:'Kilogrammes (kg)'},{value:'lbs',label:'Livres (lbs)'}]} onChange={v => updateSetting('units.weight', v)} />} />
    </SettingsSection>
  )

  const renderPostRide = () => (
    <SettingsSection title="APRÈS LA SÉANCE" theme={theme}>
      <SettingsRow theme={theme} label="Upload automatique Strava" description="Envoie la séance sur Strava dès qu'elle est terminée"
        disabled={!stravaConnected}
        right={<Toggle theme={theme} value={po.autoStrava} onChange={v => updateSetting('postRide.autoStrava', v)} disabled={!stravaConnected} />} />
      {!stravaConnected && (
        <p style={{ fontSize: 12, color: '#8C8C8C', padding: '4px 16px 8px', margin: 0 }}>
          <a href="/connections" style={{ color: '#06B6D4', textDecoration: 'none' }}>Connecte Strava</a> dans la page Connexions pour activer cette option.
        </p>
      )}
      <SettingsRow theme={theme} label="Résumé en fin de séance" description="Affiche le résumé détaillé automatiquement" last
        right={<Toggle theme={theme} value={po.showSummary} onChange={v => updateSetting('postRide.showSummary', v)} />} />
    </SettingsSection>
  )

  if (section === 'alerts')    return renderAlerts()
  if (section === 'sensors')   return renderSensors()
  if (section === 'display')   return renderDisplay()
  if (section === 'athlete')   return renderAthlete()
  if (section === 'recording') return renderRecording()
  if (section === 'units')     return renderUnits()
  if (section === 'postride')  return renderPostRide()

  return (
    <>
      {renderAlerts()}
      {renderSensors()}
      {renderDisplay()}
      {renderAthlete()}
      {renderRecording()}
      {renderUnits()}
      {renderPostRide()}
    </>
  )
}
