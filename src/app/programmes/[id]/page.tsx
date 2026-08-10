// Wrapper serveur (généré) — permet l'export statique Capacitor (phase 5) tout
// en gardant le rendu à la demande sur Vercel. La vue réelle est 100 % client
// (View.tsx) et lit le paramètre via useParams().
import View from './View'

export function generateStaticParams() { return [{ 'id': '_' }] }

export default function Page() { return <View /> }
