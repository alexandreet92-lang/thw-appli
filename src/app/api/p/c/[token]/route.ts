export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { LANDING_PATH, SITE_URL } from '@/lib/prospection/config'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lien suivi : enregistre le clic sur le dernier envoi du contact, puis redirige vers le site.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const dest = new URL(LANDING_PATH, SITE_URL)
  dest.searchParams.set('utm_source', 'email')
  dest.searchParams.set('utm_medium', 'prospection')
  if (UUID.test(token)) {
    try {
      const sb = createServiceClient()
      const { data: c } = await sb.from('prospect_contacts').select('id').eq('token', token).maybeSingle()
      const id = (c as { id: string } | null)?.id
      if (id) {
        const { data: s } = await sb.from('prospect_sends').select('id, click_count')
          .eq('contact_id', id).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle()
        const send = s as { id: number; click_count: number } | null
        if (send) {
          await sb.from('prospect_sends')
            .update({ click_count: send.click_count + 1, clicked_at: new Date().toISOString() }).eq('id', send.id)
        }
      }
    } catch { /* la redirection prime sur le suivi */ }
  }
  return NextResponse.redirect(dest.toString(), 302)
}
