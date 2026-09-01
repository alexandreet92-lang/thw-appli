'use client'
// Fiche athlète — adresse FIXE `/coach/athlete?id=…` (paramètre de requête).
// Contrairement au chemin dynamique /coach/athlete/[id] (qui CASSE dans le
// bundle statique natif → renvoyait au Dashboard), une route fixe est TOUJOURS
// présente dans l'export statique → fonctionne en natif comme sur le web.
// La vue réelle lit l'id via useSearchParams() (voir ./[id]/View.tsx).
import { Suspense } from 'react'
import View from './[id]/View'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <View />
    </Suspense>
  )
}
