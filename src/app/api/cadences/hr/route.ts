// ═════════════════════════════════════════════════════════════════
// CADENCES — courbes de fréquence cardiaque d'une épreuve (SITE uniquement, cookie → 401 en natif).
// PUT upsert une courbe · GET lit les courbes d'une campagne. RLS : propriétaire seulement.
// Facultatif : un test sans sangle cardio n'écrit jamais ici.
// ═════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConfig, testBySlug } from '@/lib/cadences/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_SAMPLES = 4000

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function cleanSummary(raw: unknown): Record<string, unknown> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of ['min', 'max', 'avg', 'restStart', 'peakAt']) { const n = num(o[k]); if (n != null) out[k] = Math.round(n * 10) / 10 }
  if (Array.isArray(o.segments)) {
    out.segments = o.segments.slice(0, 60).map((s) => {
      const r = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>
      return {
        label: typeof r.label === 'string' ? r.label.slice(0, 60) : '',
        from: num(r.from), to: num(r.to),
        min: num(r.min), max: num(r.max), avg: num(r.avg),
      }
    })
  }
  return out
}

export async function PUT(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof b?.campaignId === 'string' ? b.campaignId : ''
  const slug = typeof b?.slug === 'string' ? b.slug : ''
  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return NextResponse.json({ erreur: 'Campagne manquante.' }, { status: 400 })

  const { data: camp } = await sb.from('cadences_campaigns').select('test_key').eq('id', campaignId).eq('user_id', user.id).maybeSingle()
  if (!camp) return NextResponse.json({ erreur: 'Test introuvable.' }, { status: 404 })
  if (!testBySlug(slug, getConfig(camp.test_key as string | undefined))) return NextResponse.json({ erreur: 'Épreuve invalide.' }, { status: 400 })

  const raw = Array.isArray(b?.samples) ? (b.samples as unknown[]) : []
  if (raw.length > MAX_SAMPLES) return NextResponse.json({ erreur: 'Trop de mesures.' }, { status: 400 })
  const samples: [number, number][] = []
  for (const s of raw) {
    if (!Array.isArray(s)) continue
    const t = num(s[0]), bpm = num(s[1])
    if (t == null || bpm == null || t < 0 || t > 7200 || bpm < 30 || bpm > 240) continue
    samples.push([Math.round(t * 10) / 10, Math.round(bpm)])
  }
  if (samples.length < 5) return NextResponse.json({ erreur: 'Courbe trop courte.' }, { status: 400 })

  const { error } = await sb.from('cadences_hr_traces').upsert(
    { campaign_id: campaignId, test_slug: slug, user_id: user.id, samples, summary: cleanSummary(b?.summary) },
    { onConflict: 'campaign_id,test_slug' },
  )
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const campaignId = new URL(request.url).searchParams.get('campaignId') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return NextResponse.json({ erreur: 'Campagne manquante.' }, { status: 400 })
  const { data, error } = await sb.from('cadences_hr_traces').select('test_slug, samples, summary').eq('campaign_id', campaignId).eq('user_id', user.id)
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ traces: data ?? [] })
}
