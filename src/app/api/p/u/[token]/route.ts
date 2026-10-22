export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function unsubscribe(token: string): Promise<boolean> {
  if (!UUID.test(token)) return false
  const { data } = await createServiceClient().from('prospect_contacts')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('token', token).eq('status', 'active').select('id')
  // Déjà désinscrit ou jeton inconnu : on répond quand même « ok » (rien à révéler).
  return Array.isArray(data)
}

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px;margin:0 0 10px">Tu es désinscrit</h1>
<p style="font-size:15px;line-height:1.5;color:#444;margin:0">Tu ne recevras plus de messages de THW. Désolé pour le dérangement.</p></div></body></html>`

// Lien dans le message.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  try { await unsubscribe(token) } catch { /* ignoré */ }
  return new NextResponse(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

// Désinscription en un clic (RFC 8058) déclenchée par Gmail / Apple Mail.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  try { await unsubscribe(token) } catch { /* ignoré */ }
  return NextResponse.json({ ok: true })
}
