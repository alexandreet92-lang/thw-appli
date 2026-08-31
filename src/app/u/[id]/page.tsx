// Wrapper serveur (généré) — permet l'export statique Capacitor (phase 5) tout
// en gardant le rendu à la demande sur Vercel. La vue réelle est 100 % client
// (View.tsx) et lit l'id via useParams(). Sans generateStaticParams, le build
// `output: export` de l'app native échoue (« missing generateStaticParams »).
import PublicProfileView from './View'

export function generateStaticParams() { return [{ 'id': '_' }] }

export default function Page() { return <PublicProfileView /> }
