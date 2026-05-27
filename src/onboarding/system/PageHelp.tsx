'use client'
import type { PageOnboardingConfig } from './types'
import { OnboardingOverlay } from './OnboardingOverlay'

interface Props { config: PageOnboardingConfig; show: boolean; onDismiss: () => void }

export function PageHelp({ config, show, onDismiss }: Props) {
  if (!show) return null
  return <OnboardingOverlay config={config} onDismiss={onDismiss} />
}
