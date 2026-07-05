'use client'
import { useProfile } from '@/hooks/useProfile'
import { SettingsSection, SettingsSectionSubtitle } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import { NumberInput } from './settings/NumberInput'
import type { ThemeColors } from './settings/types'
import type { RunningSettings } from '@/hooks/useRunningSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { useI18n } from '@/lib/i18n'

interface Props {
  settings: RunningSettings
  updateSetting: (path: string, value: unknown) => void
  theme: ThemeColors
  section?: string
}

const sensor = { hr: false, cadence: false }

export default function RunningSettingsParams({ settings, updateSetting, theme, section }: Props) {
  const { t } = useI18n()
  const { profile } = useProfile()
  const al = settings.alerts
  const di = settings.display
  const at = settings.athlete
  const re = settings.recording
  const un = settings.units
  const po = settings.postRun

  const { stravaConnected } = useStravaConnection()

  const renderAlerts = () => (
    <SettingsSection title={t('record.runningParamsAlertsTitle')} theme={theme}>
      <SettingsSectionSubtitle label={t('record.runningParamsSystemAlerts')} theme={theme} />
      <SettingsRow theme={theme} label={t('record.runningParamsGpsLostAlert')} description={t('record.runningParamsGpsLostAlertDesc')}
        right={<Toggle theme={theme} value={al.gpsLost} onChange={v => updateSetting('alerts.gpsLost', v)} />} />
      <SettingsSectionSubtitle label={t('record.runningParamsHeartRate')} badge={t('record.runningParamsSensorRequired')} theme={theme} />
      <SettingsRow theme={theme} label={t('record.runningParamsHrZoneAlert')} description={t('record.runningParamsHrZoneAlertDesc')}
        disabled={!sensor.hr}
        right={<Toggle theme={theme} value={al.hrZone} onChange={v => updateSetting('alerts.hrZone', v)} disabled={!sensor.hr} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsHrMaxThreshold')} description={t('record.runningParamsHrMaxThresholdDesc')} disabled={!sensor.hr}
        right={<NumberInput theme={theme} value={al.hrMaxThreshold} min={100} max={220} step={5} unit="bpm" onChange={v => updateSetting('alerts.hrMaxThreshold', v)} disabled={!sensor.hr} />} />
      <SettingsSectionSubtitle label={t('record.runningParamsEffortReminders')} theme={theme} />
      <SettingsRow theme={theme} label={t('record.runningParamsHydrationReminder')}
        right={<Select theme={theme} value={al.hydrationInterval} options={[{value:0,label:t('record.runningParamsDisabled')},{value:15,label:'15 min'},{value:20,label:'20 min'},{value:30,label:'30 min'},{value:45,label:'45 min'}]} onChange={v => updateSetting('alerts.hydrationInterval', Number(v))} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsNutritionReminder')}
        right={<Select theme={theme} value={al.nutritionInterval} options={[{value:0,label:t('record.runningParamsDisabled')},{value:20,label:'20 min'},{value:30,label:'30 min'},{value:45,label:'45 min'},{value:60,label:'60 min'}]} onChange={v => updateSetting('alerts.nutritionInterval', Number(v))} />} />
      <SettingsSectionSubtitle label={t('record.runningParamsAlertFormat')} theme={theme} />
      <SettingsRow theme={theme} label={t('record.runningParamsVibration')}
        right={<Toggle theme={theme} value={al.vibration} onChange={v => updateSetting('alerts.vibration', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsSound')} last
        right={<Toggle theme={theme} value={al.sound} onChange={v => updateSetting('alerts.sound', v)} />} />
    </SettingsSection>
  )

  const renderSensors = () => (
    <SettingsSection title={t('record.runningParamsSensorsTitle')} theme={theme}>
      <div style={{ padding: '10px 16px 14px', background: 'rgba(6,182,212,0.06)', borderBottom: `1px solid ${theme.separator}` }}>
        <p style={{ fontSize: 12, color: '#06B6D4', margin: 0, lineHeight: 1.5 }}>{t('record.runningParamsBluetoothSoon')}</p>
      </div>
      {[
        { id:'hr',      label:t('record.runningParamsHeartRate'), desc:t('record.runningParamsHrSensorDesc') },
        { id:'cadence', label:t('record.runningParamsCadence'),    desc:t('record.runningParamsCadenceSensorDesc') },
      ].map((s, i, arr) => (
        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i < arr.length-1 ? `1px solid ${theme.separator}` : 'none' }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15, color:theme.text, margin:0 }}>{s.label}</p>
            <p style={{ fontSize:12, color:'#8C8C8C', margin:'2px 0 0' }}>{s.desc}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#8C8C8C' }}>{t('record.runningParamsNotConnected')}</span>
            <span style={{ fontSize:10, color:'#06B6D4', border:'1px solid rgba(6,182,212,0.4)', borderRadius:20, padding:'2px 8px' }}>{t('record.runningParamsSoon')}</span>
          </div>
        </div>
      ))}
    </SettingsSection>
  )

  const renderDisplay = () => (
    <SettingsSection title={t('record.runningParamsDisplayTitle')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.runningParamsKeepAwake')} description={t('record.runningParamsKeepAwakeDesc')}
        right={<Toggle theme={theme} value={di.keepAwake} onChange={v => { updateSetting('display.keepAwake', v); if (v && 'wakeLock' in navigator) { (navigator as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request('screen').catch(() => {}) } }} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsCounterTheme')}
        right={<Select theme={theme} value={di.theme} options={[{value:'auto',label:t('record.runningParamsThemeAuto')},{value:'light',label:t('record.runningParamsThemeLight')},{value:'dark',label:t('record.runningParamsThemeDark')}]} onChange={v => updateSetting('display.theme', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsDataSize')}
        right={<Select theme={theme} value={di.dataSize} options={[{value:'small',label:t('record.runningParamsSizeSmall')},{value:'normal',label:t('record.runningParamsSizeNormal')},{value:'large',label:t('record.runningParamsSizeLarge')}]} onChange={v => updateSetting('display.dataSize', v)} />} />
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.separator}` }}>
        <p style={{ fontSize: 15, color: theme.text, margin: '0 0 12px' }}>{t('record.runningParamsDataFont')}</p>
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
                <span style={{ fontSize: 24, fontWeight: 700, color: active ? '#06B6D4' : theme.text, fontFamily: font.fontFamily, letterSpacing: '-0.5px' }}>4:32</span>
              </button>
            )
          })}
        </div>
      </div>
    </SettingsSection>
  )

  const renderAthlete = () => (
    <SettingsSection title={t('record.runningParamsAthleteTitle')} theme={theme}>
      <div style={{ padding: '8px 16px 4px' }}>
        <p style={{ fontSize: 12, color: '#8C8C8C', margin: 0 }}>{t('record.runningParamsAthleteIntro')}</p>
      </div>
      <SettingsRow theme={theme} label="VMA" description={t('record.runningParamsVmaDesc')}
        right={<NumberInput theme={theme} value={at.vma} min={6} max={30} step={0.5} unit="km/h" onChange={v => updateSetting('athlete.vma', v)} />} />
      <SettingsRow theme={theme} label="FC max" description={t('record.runningParamsMaxHrDesc')}
        right={<NumberInput theme={theme} value={at.maxHr} min={100} max={220} step={1} unit="bpm" onChange={v => updateSetting('athlete.maxHr', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsRestHr')}
        right={<NumberInput theme={theme} value={at.restHr} min={30} max={100} step={1} unit="bpm" onChange={v => updateSetting('athlete.restHr', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsWeight')} description={t('record.runningParamsWeightDesc')} last
        right={<span style={{ fontSize: 14, color: '#8C8C8C' }}>{profile?.weight_kg ?? '—'} kg</span>} />
      <div style={{ padding: '12px 16px 4px', marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: theme.dim, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{t('record.runningParamsTargetPaces')}</p>
      </div>
      {([
        { path: 'athlete.pace5k',       label: '5 km',      val: at.pace5k },
        { path: 'athlete.pace10k',      label: '10 km',     val: at.pace10k },
        { path: 'athlete.paceHalf',     label: t('record.runningParamsHalfMarathon'), val: at.paceHalf },
        { path: 'athlete.paceMarathon', label: t('record.runningParamsMarathon'),  val: at.paceMarathon },
      ] as const).map(({ path, label, val }) => (
        <div key={path} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid ${theme.separator}` }}>
          <span style={{ flex:1, fontSize:14, color:theme.text }}>{label}</span>
          <input
            key={val}
            defaultValue={val}
            placeholder="4:30"
            onBlur={e => updateSetting(path, e.target.value.trim() || val)}
            style={{ width: 70, textAlign:'right', background:'none', border:'none', borderBottom:`1px solid ${theme.separator}`, color:theme.text, fontSize:14, outline:'none', fontFamily:'DM Sans, sans-serif' }}
          />
          <span style={{ fontSize:12, color:'#8C8C8C' }}>min/km</span>
        </div>
      ))}
    </SettingsSection>
  )

  const renderRecording = () => (
    <SettingsSection title={t('record.runningParamsRecordingTitle')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.runningParamsGpsFrequency')}
        right={<Select theme={theme} value={re.gpsFrequency} options={[{value:1,label:t('record.runningParamsOneSecond')},{value:5,label:t('record.runningParamsFiveSeconds')},{value:'auto',label:t('record.runningParamsAuto')}]} onChange={v => updateSetting('recording.gpsFrequency', v === 'auto' ? 'auto' : Number(v))} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsAutoPause')} description={t('record.runningParamsAutoPauseDesc')}
        right={<Toggle theme={theme} value={re.autoPause} onChange={v => updateSetting('recording.autoPause', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsAutoPauseThreshold')} disabled={!re.autoPause}
        right={<Select theme={theme} value={re.autoPauseThreshold} options={[{value:0.5,label:'0.5 km/h'},{value:1,label:'1 km/h'},{value:2,label:'2 km/h'}]} onChange={v => updateSetting('recording.autoPauseThreshold', Number(v))} disabled={!re.autoPause} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsAutoLap')} last
        right={<Select theme={theme} value={re.autoLap} options={[{value:0,label:t('record.runningParamsDisabled')},{value:1,label:'1 km'},{value:5,label:'5 km'},{value:10,label:'10 km'},{value:21,label:'21 km'}]} onChange={v => updateSetting('recording.autoLap', Number(v))} />} />
    </SettingsSection>
  )

  const renderUnits = () => (
    <SettingsSection title={t('record.runningParamsUnitsTitle')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.runningParamsDistanceSpeed')}
        right={<Select theme={theme} value={un.distance} options={[{value:'metric',label:'km / km/h'},{value:'imperial',label:'miles / mph'}]} onChange={v => updateSetting('units.distance', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsAltitude')}
        right={<Select theme={theme} value={un.altitude} options={[{value:'m',label:t('record.runningParamsMeters')},{value:'ft',label:t('record.runningParamsFeet')}]} onChange={v => updateSetting('units.altitude', v)} />} />
      <SettingsRow theme={theme} label={t('record.runningParamsPace')} last
        right={<Select theme={theme} value={di.paceUnit} options={[{value:'min/km',label:'min/km'},{value:'min/mile',label:'min/mile'}]} onChange={v => updateSetting('display.paceUnit', v)} />} />
    </SettingsSection>
  )

  const renderPostRun = () => (
    <SettingsSection title={t('record.runningParamsPostRunTitle')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.runningParamsAutoStrava')} description={t('record.runningParamsAutoStravaDesc')}
        disabled={!stravaConnected}
        right={<Toggle theme={theme} value={po.autoStrava} onChange={v => updateSetting('postRun.autoStrava', v)} disabled={!stravaConnected} />} />
      {stravaConnected ? (
        <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 12, color: '#10B981' }}>{t('record.runningParamsStravaConnected')}</span>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#8C8C8C', padding: '4px 16px 8px', margin: 0 }}>
          <a href="/connections" style={{ color: '#06B6D4', textDecoration: 'none' }}>{t('record.runningParamsConnectStrava')}</a>{t('record.runningParamsConnectStravaSuffix')}
        </p>
      )}
      <SettingsRow theme={theme} label={t('record.runningParamsSummary')} description={t('record.runningParamsSummaryDesc')} last
        right={<Toggle theme={theme} value={po.showSummary} onChange={v => updateSetting('postRun.showSummary', v)} />} />
    </SettingsSection>
  )

  if (section === 'alerts')    return renderAlerts()
  if (section === 'sensors')   return renderSensors()
  if (section === 'display')   return renderDisplay()
  if (section === 'athlete')   return renderAthlete()
  if (section === 'recording') return renderRecording()
  if (section === 'units')     return renderUnits()
  if (section === 'postrun')   return renderPostRun()

  return (
    <>
      {renderAlerts()}
      {renderSensors()}
      {renderDisplay()}
      {renderAthlete()}
      {renderRecording()}
      {renderUnits()}
      {renderPostRun()}
    </>
  )
}
