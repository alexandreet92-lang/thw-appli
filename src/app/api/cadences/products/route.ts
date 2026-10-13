// ══════════════════════════════════════════════════════════════════
// CADENCES — la liste des tests, pour la page « Les tests » et les sections
// d'accueil (public, lecture seule). Tout vient de la config des batteries.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { productCards } from '@/lib/cadences/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const res = NextResponse.json({ products: productCards() })
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return res
}
