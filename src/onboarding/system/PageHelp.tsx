'use client'
import type { PageOnboardingConfig } from './types'

interface Props { config: PageOnboardingConfig; show: boolean; onDismiss: () => void }

// Les animations d'introduction de page (overlay au premier passage) ont été
// retirées à la demande. Ce composant ne rend plus rien : aucune page n'affiche
// d'animation d'explication. (On conserve la signature pour ne pas toucher tous
// les appels existants.)
export function PageHelp(_props: Props) {
  return null
}
