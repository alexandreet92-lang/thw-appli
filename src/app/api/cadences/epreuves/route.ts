// ══════════════════════════════════════════════════════════════════
// CADENCES — liste publique des épreuves (pour les liens du site vers chaque page d'épreuve).
// Lecture seule, aucune donnée utilisateur.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { epreuveIndex } from '@/lib/cadences/epreuves'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const res = NextResponse.json({ epreuves: epreuveIndex() })
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return res
}
