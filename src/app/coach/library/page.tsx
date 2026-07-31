'use client'
export const dynamic = 'force-dynamic'

// La Bibliothèque coach EST la page Session athlète, réutilisée telle quelle :
// même compte, mêmes données → toute modif se reflète des deux côtés (synchro
// bidirectionnelle automatique, aucune duplication de données).
import SessionPage from '@/app/session/page'

export default function CoachLibrary() {
  return <SessionPage />
}
