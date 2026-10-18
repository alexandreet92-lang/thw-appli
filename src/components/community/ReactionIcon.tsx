import { ThumbsUp, Flame, Dumbbell, Hand, Smile, PartyPopper } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ReactionKey } from '@/lib/community/reactions'

const ICONS: Record<ReactionKey, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  like: ThumbsUp, fire: Flame, strong: Dumbbell, clap: Hand, smile: Smile, celebrate: PartyPopper,
}

/** Pictogramme SVG d'une réaction (clé canonique ; les anciennes valeurs sont normalisées en amont). */
export function ReactionIcon({ value, size = 18 }: { value: string; size?: number }) {
  const Icon = ICONS[value as ReactionKey]
  return Icon ? <Icon size={size} strokeWidth={2} /> : <span style={{ fontSize: size * 0.7 }}>{value}</span>
}
