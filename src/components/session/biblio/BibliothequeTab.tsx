'use client'
// ══════════════════════════════════════════════════════════════════
// Bibliothèque — orchestrateur : grille des sports ↔ détail d'un sport.
// Design : SportGrid / SportDetail / sportTheme (source de couleurs unique).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { SlideView } from '@/components/ui/SlideView'
import { SportGrid } from './SportGrid'
import { SportDetail } from './SportDetail'
import { SPORT_THEME, type SportId } from './sportTheme'

export function BibliothequeTab() {
  const [sport, setSport] = useState<SportId | null>(null)
  const [dir, setDir] = useState(1)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={sport ? `sport-${sport}` : 'grid'} direction={dir}>
        {sport ? (
          <SportDetail theme={SPORT_THEME[sport]} onBack={() => { setDir(-1); setSport(null) }} />
        ) : (
          <SportGrid onSelect={id => { setDir(1); setSport(id) }} />
        )}
      </SlideView>
    </div>
  )
}
