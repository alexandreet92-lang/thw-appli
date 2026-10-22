export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// GIF 1x1 transparent.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Indicatif : certains clients (Apple Mail) préchargent l'image, une « ouverture » n'est donc pas une lecture.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (UUID.test(token)) {
    try {
      const sb = createServiceClient()
      const { data: c } = await sb.from('prospect_contacts').select('id').eq('token', token).maybeSingle()
      const id = (c as { id: string } | null)?.id
      if (id) {
        const { data: s } = await sb.from('prospect_sends').select('id, open_count')
          .eq('contact_id', id).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle()
        const send = s as { id: number; open_count: number } | null
        if (send) {
          await sb.from('prospect_sends')
            .update({ open_count: send.open_count + 1, opened_at: new Date().toISOString() }).eq('id', send.id)
        }
      }
    } catch { /* ignoré */ }
  }
  return new NextResponse(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' },
  })
}
