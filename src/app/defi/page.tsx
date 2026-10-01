// Page PUBLIQUE du test physique « Défi Hybrid ». Ouverte par un QR déposé chez
// un partenaire. Aucune connexion, aucun téléchargement : tout se passe sur le
// site. `s` = code de l'établissement, `t` = numéro de table (restos).
import { DefiClient } from './DefiClient'

export const dynamic = 'force-dynamic'

export default async function DefiPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; t?: string }>
}) {
  const sp = await searchParams
  const code = typeof sp.s === 'string' && sp.s.trim() ? sp.s.trim() : null
  const table = typeof sp.t === 'string' && /^\d+$/.test(sp.t) ? parseInt(sp.t, 10) : null
  return <DefiClient code={code} table={table} />
}
