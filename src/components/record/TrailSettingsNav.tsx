'use client'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import type { ThemeColors } from './settings/types'
import type { TrailSettings } from '@/hooks/useTrailSettings'
import { useI18n } from '@/lib/i18n'

interface Props {
  settings: TrailSettings
  updateSetting: (path: string, value: unknown) => void
  theme: ThemeColors
}

export default function TrailSettingsNav({ settings, updateSetting, theme }: Props) {
  const { t } = useI18n()
  const nav = settings.navigation
  return (
    <SettingsSection title={t('record.settingsSec_navigation')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.trailNavFollow')}
        description={t('record.trailNavFollowDesc')}
        right={<Toggle theme={theme} value={nav.followPosition} onChange={v => updateSetting('navigation.followPosition', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.trailNavAutoRecenter')}
        description={t('record.trailNavAutoRecenterDesc')}
        disabled={!nav.followPosition}
        right={<Toggle theme={theme} value={nav.autoRecenter} onChange={v => updateSetting('navigation.autoRecenter', v)} disabled={!nav.followPosition} />}
      />
      <SettingsRow theme={theme} label={t('record.trailNavDefaultMapType')}
        right={<Select theme={theme} value={nav.defaultMapType}
          options={[{ value:'std', label:t('record.trailNavMapStd') }, { value:'sat', label:t('record.trailNavMapSat') }, { value:'hyb', label:t('record.trailNavMapHyb') }]}
          onChange={v => updateSetting('navigation.defaultMapType', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.trailNavClimbDetection')}
        description={t('record.trailNavClimbDetectionDesc')}
        right={<Toggle theme={theme} value={nav.climbDetection} onChange={v => updateSetting('navigation.climbDetection', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.trailNavClimbThreshold')} last
        description={t('record.trailNavClimbThresholdDesc')}
        disabled={!nav.climbDetection}
        right={<Select theme={theme} value={nav.climbThreshold}
          options={[{ value:30, label:'30 m' }, { value:50, label:'50 m' }, { value:100, label:'100 m' }]}
          onChange={v => updateSetting('navigation.climbThreshold', Number(v))}
          disabled={!nav.climbDetection} />}
      />
    </SettingsSection>
  )
}
