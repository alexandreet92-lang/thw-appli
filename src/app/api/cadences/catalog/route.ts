// ══════════════════════════════════════════════════════════════════
// CADENCES — métadonnées d'affichage pour LE SITE (public, lecture seule).
// Le site (public/site, sans bundler) ne peut pas importer le moteur TS :
// il récupère ici le plan des jours, les épreuves, les protocoles, les
// qualités, les niveaux et la palette. Aucun secret, aucun calcul.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/cadences/catalog'
import { buildCatalogView } from '@/lib/cadences/catalogView'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  // Produit demandé (?test_key=) — repli Decaform.
  const testKey = new URL(request.url).searchParams.get('test_key')
  const res = NextResponse.json(buildCatalogView(getConfig(testKey)))
  // Lecture publique, stable sur la durée d'une version de barème.
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return res
}
