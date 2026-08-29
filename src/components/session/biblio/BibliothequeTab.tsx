'use client'
// ══════════════════════════════════════════════════════════════════
// Bibliothèque — orchestrateur : grille des sports ↔ détail d'un sport.
// Design : SportGrid / SportDetail / sportTheme (source de couleurs unique).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { SlideView } from '@/components/ui/SlideView'
import { SportGrid } from './SportGrid'
import { SportDetail } from './SportDetail'
import { SPORT_THEME, type SportId } from './sportTheme'

export function BibliothequeTab({ guideSport }: { guideSport?: string | null }) {
  const [sport, setSport] = useState<SportId | null>(null)
  const [dir, setDir] = useState(1)

  // Le GUIDE demande d'ouvrir un sport (démo « Ouvre un sport ») → on affiche sa fiche
  // pour montrer ses familles de séances. On n'agit que sur un sport valide : la
  // navigation manuelle (hors guide) n'est jamais perturbée.
  useEffect(() => {
    if (guideSport && (guideSport as SportId) in SPORT_THEME) { setDir(1); setSport(guideSport as SportId) }
  }, [guideSport])

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
