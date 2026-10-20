// Dit au site (compte.html) si l'utilisateur courant est l'administrateur, pour
// n'afficher le lien « Statistiques » qu'à lui. Ne révèle rien d'autre ; la vraie
// protection reste côté serveur sur /api/admin/stats (403 pour tout autre compte).
import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const admin = await checkAdmin()
  return NextResponse.json({ admin: admin.ok }, { headers: { 'Cache-Control': 'no-store' } })
}
