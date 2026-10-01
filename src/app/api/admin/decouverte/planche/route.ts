// ══════════════════════════════════════════════════════════════════
// DÉCOUVERTE — planche de QR à imprimer (ADMIN UNIQUEMENT).
//
// GET /api/admin/decouverte/planche?code=<code> → page HTML A4 imprimable :
// une carte par table (resto) ou une seule carte (établissement sans tables).
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin/guard'
import { fichesPlanche, plancheHTML } from '@/lib/decouverte/qr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const admin = await checkAdmin()
  if (!admin.ok) return new Response('Non autorisé.', { status: admin.status })

  const code = new URL(request.url).searchParams.get('code') ?? ''
  if (!code) return new Response('Code manquant.', { status: 400 })

  const sb = createServiceClient()
  const { data: source } = await sb
    .from('decouverte_sources')
    .select('code, etablissement, tables')
    .eq('code', code)
    .maybeSingle()
  if (!source) return new Response('Établissement introuvable.', { status: 404 })

  // Base du site : le domaine public (jamais localhost en prod).
  const entetes = await headers()
  const hote = entetes.get('x-forwarded-host') || entetes.get('host') || 'the-hybridway.com'
  const protocole = entetes.get('x-forwarded-proto') || (hote.startsWith('localhost') ? 'http' : 'https')
  const base = `${protocole}://${hote}`

  const fiches = await fichesPlanche(base, {
    code: source.code,
    etablissement: source.etablissement,
    tables: source.tables ?? 0,
  })
  const html = plancheHTML(source.etablissement, fiches)

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
