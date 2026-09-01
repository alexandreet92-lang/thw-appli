// Ancien chemin dynamique /coach/athlete/[id] — CONSERVÉ pour compatibilité
// (anciennes notifications / liens). Les nouveaux liens utilisent l'adresse fixe
// /coach/athlete?id=… (voir ../page.tsx) qui, elle, fonctionne en natif.
// Suspense obligatoire : la vue lit useSearchParams().
import { Suspense } from 'react'
import View from './View'

export function generateStaticParams() { return [{ 'id': '_' }] }

export default function Page() {
  return (
    <Suspense fallback={null}>
      <View />
    </Suspense>
  )
}
