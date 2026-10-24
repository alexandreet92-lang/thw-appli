export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubToken } from '@/lib/lifecycle/service'

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THW</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px;margin:0 0 10px">Tu es désinscrit</h1>
<p style="font-size:15px;line-height:1.5;color:#444;margin:0">Tu ne recevras plus ces e-mails de THW. Tes e-mails de service (sécurité, abonnement) restent actifs.</p></div></body></html>`

async function optOut(token: string) {
  const id = verifyUnsubToken(token)
  if (id) await createServiceClient().from('lifecycle_optout').upsert({ user_id: id })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  try { await optOut(token) } catch { /* ignoré */ }
  return new NextResponse(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

// Désinscription en un clic (RFC 8058).
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  try { await optOut(token) } catch { /* ignoré */ }
  return NextResponse.json({ ok: true })
}
