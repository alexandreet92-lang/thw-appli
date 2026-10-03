// Wrapper serveur (généré) — permet l'export statique Capacitor (phase 5) tout
// en gardant le rendu à la demande sur Vercel. La vue réelle est 100 % client
// (View.tsx) et lit l'id via useParams(). Sans generateStaticParams, le build
// `output: export` de l'app native échoue (« missing generateStaticParams »).
// Page PUBLIQUE (sans compte) : /live est listée dans les routes publiques du
// middleware et dans les routes plein écran (aucun chrome d'app).
import type { Metadata } from 'next'
import LiveTrackView from './View'

export const metadata: Metadata = {
  title: 'Suivi en direct',
  description: 'Suis cette sortie en direct : position, distance et durée mises à jour en temps réel.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Suivi en direct',
    description: 'Suis cette sortie en direct : position, distance et durée mises à jour en temps réel.',
  },
}

export function generateStaticParams() { return [{ 'id': '_' }] }

export default function Page() { return <LiveTrackView /> }
