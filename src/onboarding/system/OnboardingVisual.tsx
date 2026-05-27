'use client'
import type { OnboardingSlide } from './types'
import { ChartVisual } from './visuals/ChartVisual'
import { MockupVisual } from './visuals/MockupVisual'
import { IconGridVisual } from './visuals/IconGridVisual'
import { StatsVisual } from './visuals/StatsVisual'

interface Props { slide: OnboardingSlide }

export function OnboardingVisual({ slide }: Props) {
  switch (slide.visual) {
    case 'chart':     return <ChartVisual config={slide.visualConfig} />
    case 'mockup':    return <MockupVisual config={slide.visualConfig} />
    case 'icon_grid': return <IconGridVisual config={slide.visualConfig} />
    case 'stats':     return <StatsVisual config={slide.visualConfig} />
    default:          return null
  }
}
