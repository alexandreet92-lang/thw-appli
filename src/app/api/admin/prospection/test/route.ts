import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'
import { createServiceClient } from '@/lib/supabase/server'
import { loadSettings } from '@/lib/prospection/service'
import { renderEmail } from '@/lib/prospection/template'
import { sendProspectEmail, sesConfigured } from '@/lib/prospection/ses'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Envoie le message tel qu'il partira, à l'adresse de l'admin (aucune ligne de contact créée).
export async function POST(): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok || !admin.email) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  if (!sesConfigured()) return NextResponse.json({ erreur: 'SES non configuré (clés AWS manquantes).' }, { status: 409 })
  try {
    const s = await loadSettings(createServiceClient())
    if (!s.from_email.trim()) return NextResponse.json({ erreur: 'Renseigne l’adresse expéditeur.' }, { status: 409 })
    const mail = renderEmail(s, { id: 'test', email: admin.email, first_name: 'Alexandre', token: '00000000-0000-0000-0000-000000000000' })
    await sendProspectEmail({
      to: admin.email, fromName: s.from_name, fromEmail: s.from_email,
      subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html, unsubscribeUrl: mail.unsubscribeUrl,
    })
    return NextResponse.json({ ok: true, to: admin.email })
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message.slice(0, 200) : 'Envoi impossible.' }, { status: 502 })
  }
}
