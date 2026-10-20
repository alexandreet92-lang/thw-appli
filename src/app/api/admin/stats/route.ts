import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'
import { getSiteStats } from '@/lib/stats/siteStats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  const range = Number(new URL(request.url).searchParams.get('range') ?? 30)
  try {
    return NextResponse.json(await getSiteStats(Number.isFinite(range) ? range : 30), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ erreur: 'Statistiques indisponibles.' }, { status: 502 })
  }
}
