'use client'
import { SettingsSection } from './settings/SettingsSection'
import { SettingsRow } from './settings/SettingsRow'
import { Toggle } from './settings/Toggle'
import { Select } from './settings/Select'
import type { ThemeColors } from './settings/types'
import type { CyclingSettings } from '@/hooks/useCyclingSettings'

interface Props {
  settings: CyclingSettings
  updateSetting: (path: string, value: unknown) => void
  theme: ThemeColors
}

export default function CyclingSettingsNav({ settings, updateSetting, theme }: Props) {
  const nav = settings.navigation
  return (
    <SettingsSection title="NAVIGATION" theme={theme}>
      <SettingsRow theme={theme} label="Détecter ma position"
        description="Centre la carte sur ta position en temps réel"
        right={<Toggle theme={theme} value={nav.followPosition} onChange={v => updateSetting('navigation.followPosition', v)} />}
      />
      <SettingsRow theme={theme} label="Recentrage automatique"
        description="Recentre la carte après 10 secondes sans interaction"
        disabled={!nav.followPosition}
        right={<Toggle theme={theme} value={nav.autoRecenter} onChange={v => updateSetting('navigation.autoRecenter', v)} disabled={!nav.followPosition} />}
      />
      <SettingsRow theme={theme} label="Type de carte par défaut"
        right={<Select theme={theme} value={nav.defaultMapType}
          options={[{ value:'std', label:'Standard' }, { value:'sat', label:'Satellite' }, { value:'hyb', label:'Hybride' }]}
          onChange={v => updateSetting('navigation.defaultMapType', v)} />}
      />
      <SettingsRow theme={theme} label="Détection des montées"
        description="Affiche le profil de montée quand un parcours est chargé"
        right={<Toggle theme={theme} value={nav.climbDetection} onChange={v => updateSetting('navigation.climbDetection', v)} />}
      />
      <SettingsRow theme={theme} label="Seuil de détection montée" last
        description="Dénivelé minimum pour détecter une montée"
        disabled={!nav.climbDetection}
        right={<Select theme={theme} value={nav.climbThreshold}
          options={[{ value:30, label:'30 m' }, { value:50, label:'50 m' }, { value:100, label:'100 m' }]}
          onChange={v => updateSetting('navigation.climbThreshold', Number(v))}
          disabled={!nav.climbDetection} />}
      />
    </SettingsSection>
  )
}
