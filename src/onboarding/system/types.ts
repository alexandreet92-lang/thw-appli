export interface OnboardingSlide {
  id: string
  badge?: string
  title: string
  description: string
  keyPoints?: string[]
  visual: 'chart' | 'mockup' | 'icon_grid' | 'stats' | 'custom'
  visualConfig: Record<string, unknown>
  features: string[]
}

export interface PageOnboardingConfig {
  pageId: string
  version: number
  slides: OnboardingSlide[]
}
