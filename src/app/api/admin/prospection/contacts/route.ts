import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

interface Body { text?: string; source?: string; consent_note?: string }
interface Row { email: string; first_name: string | null; source: string; consent_note: string }

/** Une ligne par contact : « email », « email, prénom » ou « prénom; email ». */
function parse(text: string, source: string, consent: string): { rows: Row[]; invalid: number } {
  const seen = new Set<string>()
  const rows: Row[] = []
  let invalid = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split(/[,;\t]/).map(s => s.trim()).filter(Boolean)
    const email = parts.find(p => EMAIL_RE.test(p))?.toLowerCase()
    if (!email) { invalid++; continue }
    if (seen.has(email)) continue
    seen.add(email)
    const first = parts.find(p => p.toLowerCase() !== email) ?? null
    rows.push({ email, first_name: first, source, consent_note: consent })
  }
  return { rows, invalid }
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  let b: Body
  try { b = (await request.json()) as Body } catch { return NextResponse.json({ erreur: 'Requête invalide.' }, { status: 400 }) }
  const source = (b.source ?? '').trim()
  const consent = (b.consent_note ?? '').trim()
  if (!b.text?.trim()) return NextResponse.json({ erreur: 'Liste vide.' }, { status: 400 })
  if (!source || !consent) {
    return NextResponse.json({ erreur: 'Source et preuve d’accord obligatoires.' }, { status: 400 })
  }
  const { rows, invalid } = parse(b.text, source.slice(0, 120), consent.slice(0, 300))
  if (rows.length > 5000) return NextResponse.json({ erreur: '5 000 contacts maximum par import.' }, { status: 400 })

  const sb = createServiceClient()
  let added = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { data, error } = await sb.from('prospect_contacts')
      .upsert(chunk, { onConflict: 'email', ignoreDuplicates: true }).select('id')
    if (error) return NextResponse.json({ erreur: 'Import impossible.' }, { status: 502 })
    added += data?.length ?? 0
  }
  return NextResponse.json({ ok: true, added, duplicates: rows.length - added, invalid })
}
