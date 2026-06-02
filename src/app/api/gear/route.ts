// Matériel de l'utilisateur (vélos + chaussures) avec stats calculées.
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getBikeStats, getShoesStats } from '@/lib/gear/stats'

export const dynamic = 'force-dynamic'

interface BikeRow { id: string }
interface ShoeRow { id: string }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const sb = createServiceClient()
    const [{ data: bikes }, { data: shoes }] = await Promise.all([
      sb.from('user_bikes').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      sb.from('user_running_shoes').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    ])

    const bikesWithStats = await Promise.all(
      ((bikes as BikeRow[] | null) ?? []).map(async (b) => ({ ...b, stats: await getBikeStats(user.id, b.id) })),
    )
    const shoesWithStats = await Promise.all(
      ((shoes as ShoeRow[] | null) ?? []).map(async (s) => ({ ...s, stats: await getShoesStats(user.id, s.id) })),
    )

    return NextResponse.json({ bikes: bikesWithStats, shoes: shoesWithStats })
  } catch (e) {
    console.error('[api/gear GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as {
      type?: 'bike' | 'shoes'
      data?: { name?: string; brand?: string; model?: string; weight_kg?: number | string }
    }
    const type = body.type
    const d = body.data ?? {}
    const name = (d.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const sb = createServiceClient()

    if (type === 'bike') {
      let weight: number | null = null
      if (d.weight_kg !== undefined && d.weight_kg !== '' && d.weight_kg !== null) {
        const w = Number(d.weight_kg)
        if (!Number.isFinite(w) || w <= 0 || w > 30) return NextResponse.json({ error: 'Poids invalide (0–30 kg)' }, { status: 400 })
        weight = w
      }
      const { data: created, error } = await sb.from('user_bikes')
        .insert({ user_id: user.id, name, brand: d.brand?.trim() || null, model: d.model?.trim() || null, weight_kg: weight })
        .select().single()
      if (error) throw error
      return NextResponse.json({ bike: created })
    }

    if (type === 'shoes') {
      const { data: created, error } = await sb.from('user_running_shoes')
        .insert({ user_id: user.id, name, brand: d.brand?.trim() || null })
        .select().single()
      if (error) throw error
      return NextResponse.json({ shoes: created })
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  } catch (e) {
    console.error('[api/gear POST]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { type, id } = await req.json() as { type?: 'bike' | 'shoes'; id?: string }
    if (!id || (type !== 'bike' && type !== 'shoes')) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const sb = createServiceClient()
    const table = type === 'bike' ? 'user_bikes' : 'user_running_shoes'
    await sb.from(table).delete().eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[api/gear DELETE]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
