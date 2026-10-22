import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'
import { renderEmail } from '@/lib/prospection/template'
import type { ProspectSettings } from '@/lib/prospection/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Body { subject?: string; body?: string; from_name?: string; from_email?: string; postal_address?: string }

// Rend le message exactement comme il partira (HTML + texte), avec les valeurs en cours d'édition.
export async function POST(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  let b: Body
  try { b = (await request.json()) as Body } catch { return NextResponse.json({ erreur: 'Requête invalide.' }, { status: 400 }) }
  const s: ProspectSettings = {
    enabled: true, daily_target: 100, send_hour: 10, ramp_start: null,
    subject: b.subject ?? '', body: b.body ?? '',
    from_name: b.from_name ?? '', from_email: b.from_email ?? '', postal_address: b.postal_address ?? '',
  }
  const m = renderEmail(s, { id: 'preview', email: 'exemple@exemple.fr', first_name: 'Léa', token: '00000000-0000-0000-0000-000000000000' })
  return NextResponse.json({ subject: m.subject, html: m.html, from: `${s.from_name} <${s.from_email || 'adresse@expediteur'}>` })
}
