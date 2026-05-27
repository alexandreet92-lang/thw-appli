export interface OnboardingSlide {
  id: string
  title: string
  description: string
  visual: 'chart' | 'mockup' | 'icon_grid' | 'stats' | 'custom'
  visualConfig: Record<string, unknown>
  features: string[]
}

export interface PageOnboardingConfig {
  pageId: string
  version: number
  slides: OnboardingSlide[]
}
