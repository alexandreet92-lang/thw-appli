export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Webhook SNS : rebonds, plaintes et livraisons publiés par Amazon SES.
// URL à déclarer dans SNS : /api/prospection/ses-events?s=<PROSPECT_WEBHOOK_SECRET>

interface SnsEnvelope { Type: string; SubscribeURL?: string; Message?: string }
interface SesEvent {
  eventType?: string
  notificationType?: string
  mail?: { messageId?: string }
  bounce?: { bounceType?: string }
}

export async function POST(req: NextRequest) {
  const secret = process.env.PROSPECT_WEBHOOK_SECRET
  if (!secret || req.nextUrl.searchParams.get('s') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let env: SnsEnvelope
  try { env = JSON.parse(await req.text()) as SnsEnvelope } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }) }

  if (env.Type === 'SubscriptionConfirmation' && env.SubscribeURL) {
    const u = new URL(env.SubscribeURL)
    if (u.protocol === 'https:' && u.hostname.endsWith('.amazonaws.com')) await fetch(u.toString())
    return NextResponse.json({ ok: true })
  }
  if (env.Type !== 'Notification' || !env.Message) return NextResponse.json({ ok: true })

  let ev: SesEvent
  try { ev = JSON.parse(env.Message) as SesEvent } catch { return NextResponse.json({ ok: true }) }
  const kind = (ev.eventType ?? ev.notificationType ?? '').toLowerCase()
  const messageId = ev.mail?.messageId
  if (!messageId) return NextResponse.json({ ok: true })

  const sb = createServiceClient()
  const { data: s } = await sb.from('prospect_sends').select('id, contact_id').eq('ses_message_id', messageId).maybeSingle()
  const send = s as { id: number; contact_id: string } | null
  if (!send) return NextResponse.json({ ok: true })

  if (kind === 'delivery') {
    await sb.from('prospect_sends').update({ delivery_status: 'delivered' }).eq('id', send.id)
  } else if (kind === 'bounce') {
    await sb.from('prospect_sends').update({ delivery_status: 'bounced' }).eq('id', send.id)
    // Rebond définitif : on ne réécrit jamais à cette adresse.
    if (ev.bounce?.bounceType === 'Permanent') {
      await sb.from('prospect_contacts').update({ status: 'bounced' }).eq('id', send.contact_id)
    }
  } else if (kind === 'complaint') {
    await sb.from('prospect_sends').update({ delivery_status: 'complained' }).eq('id', send.id)
    await sb.from('prospect_contacts').update({ status: 'complained' }).eq('id', send.contact_id)
  }
  return NextResponse.json({ ok: true })
}
