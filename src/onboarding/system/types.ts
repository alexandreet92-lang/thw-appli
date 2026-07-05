export interface OnboardingSlide {
  id: string
  badge?: string
  /** Clé i18n pour le badge (fallback sur badge FR si absente). */
  badgeKey?: string
  title: string
  /** Clé i18n pour le titre (fallback sur title FR si absente). */
  titleKey?: string
  description: string
  /** Clé i18n pour la description (fallback sur description FR si absente). */
  descriptionKey?: string
  keyPoints?: string[]
  /** Clés i18n alignées par index sur keyPoints (fallback sur le texte FR). */
  keyPointsKeys?: string[]
  visual: 'chart' | 'mockup' | 'icon_grid' | 'stats' | 'custom'
  visualConfig: Record<string, unknown>
  features: string[]
}

export interface PageOnboardingConfig {
  pageId: string
  version: number
  slides: OnboardingSlide[]
}
