import 'server-only'
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/guard'
import { createServiceClient } from '@/lib/supabase/server'
import { getOverview } from '@/lib/prospection/service'
import { parisDay } from '@/lib/prospection/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  try {
    return NextResponse.json(await getOverview(createServiceClient()), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ erreur: 'Données indisponibles.' }, { status: 502 })
  }
}

interface Patch {
  enabled?: boolean
  daily_target?: number
  send_hour?: number
  subject?: string
  body?: string
  from_name?: string
  from_email?: string
  postal_address?: string
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })
  let p: Patch
  try { p = (await request.json()) as Patch } catch { return NextResponse.json({ erreur: 'Requête invalide.' }, { status: 400 }) }

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof p.enabled === 'boolean') {
    upd.enabled = p.enabled
    // Première activation : la montée en puissance démarre aujourd'hui.
    if (p.enabled) {
      const sb = createServiceClient()
      const { data } = await sb.from('prospect_settings').select('ramp_start').eq('id', 1).single()
      if (!(data as { ramp_start: string | null } | null)?.ramp_start) upd.ramp_start = parisDay(new Date())
    }
  }
  if (typeof p.daily_target === 'number') {
    if (!Number.isInteger(p.daily_target) || p.daily_target < 1 || p.daily_target > 1_000_000) {
      return NextResponse.json({ erreur: 'Objectif : un nombre entier supérieur ou égal à 1.' }, { status: 400 })
    }
    upd.daily_target = p.daily_target
  }
  if (typeof p.send_hour === 'number') {
    if (!Number.isInteger(p.send_hour) || p.send_hour < 0 || p.send_hour > 23) {
      return NextResponse.json({ erreur: 'Heure entre 0 et 23.' }, { status: 400 })
    }
    upd.send_hour = p.send_hour
  }
  for (const k of ['subject', 'body', 'from_name', 'from_email', 'postal_address'] as const) {
    const v = p[k]
    if (typeof v === 'string') {
      if (k === 'from_email' && v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
        return NextResponse.json({ erreur: 'Adresse expéditeur invalide.' }, { status: 400 })
      }
      if ((k === 'subject' || k === 'body') && !v.trim()) {
        return NextResponse.json({ erreur: 'Objet et message ne peuvent pas être vides.' }, { status: 400 })
      }
      upd[k] = v.trim()
    }
  }
  const { error } = await createServiceClient().from('prospect_settings').update(upd).eq('id', 1)
  if (error) return NextResponse.json({ erreur: 'Enregistrement impossible.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
