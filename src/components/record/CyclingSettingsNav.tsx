'use client'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import type { ThemeColors } from './settings/types'
import type { CyclingSettings } from '@/hooks/useCyclingSettings'
import { useI18n } from '@/lib/i18n'

interface Props {
  settings: CyclingSettings
  updateSetting: (path: string, value: unknown) => void
  theme: ThemeColors
}

export default function CyclingSettingsNav({ settings, updateSetting, theme }: Props) {
  const { t } = useI18n()
  const nav = settings.navigation
  return (
    <SettingsSection title={t('record.sectionNavigationUpper')} theme={theme}>
      <SettingsRow theme={theme} label={t('record.cyclingNavDetectPosition')}
        description={t('record.cyclingNavDetectPositionDesc')}
        right={<Toggle theme={theme} value={nav.followPosition} onChange={v => updateSetting('navigation.followPosition', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.cyclingNavAutoRecenter')}
        description={t('record.cyclingNavAutoRecenterDesc')}
        disabled={!nav.followPosition}
        right={<Toggle theme={theme} value={nav.autoRecenter} onChange={v => updateSetting('navigation.autoRecenter', v)} disabled={!nav.followPosition} />}
      />
      <SettingsRow theme={theme} label={t('record.cyclingNavDefaultMapType')}
        right={<Select theme={theme} value={nav.defaultMapType}
          options={[{ value:'std', label:t('record.mapTypeStandard') }, { value:'sat', label:t('record.mapTypeSatellite') }, { value:'hyb', label:t('record.mapTypeHybrid') }]}
          onChange={v => updateSetting('navigation.defaultMapType', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.cyclingNavClimbDetection')}
        description={t('record.cyclingNavClimbDetectionDesc')}
        right={<Toggle theme={theme} value={nav.climbDetection} onChange={v => updateSetting('navigation.climbDetection', v)} />}
      />
      <SettingsRow theme={theme} label={t('record.cyclingNavClimbThreshold')} last
        description={t('record.cyclingNavClimbThresholdDesc')}
        disabled={!nav.climbDetection}
        right={<Select theme={theme} value={nav.climbThreshold}
          options={[{ value:30, label:'30 m' }, { value:50, label:'50 m' }, { value:100, label:'100 m' }]}
          onChange={v => updateSetting('navigation.climbThreshold', Number(v))}
          disabled={!nav.climbDetection} />}
      />
    </SettingsSection>
  )
}
