// ══════════════════════════════════════════════════════════════
// POST /api/parcours
//
// Sauvegarde un parcours parsé (GPX/TCX/KML) en Supabase.
// Le parsing + segmentation ont lieu côté client.
// Seul le JSON compact (elevation_profile + segments) arrive ici.
//
// Retourne { id } — le UUID du parcours créé.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ParsedSegment } from '@/lib/gpx/parser'

interface ParcoursBody {
  name: string
  totalKm: number | null
  elevationGainM: number | null
  elevationLossM: number | null
  elevationProfile: Array<{ distKm: number; ele: number }>
  segments: ParsedSegment[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = (await req.json()) as ParcoursBody

    if (!body.name || !Array.isArray(body.elevationProfile)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('parcours')
      .insert({
        user_id:           user.id,
        name:              body.name,
        total_km:          body.totalKm ?? null,
        elevation_gain_m:  body.elevationGainM ?? null,
        elevation_loss_m:  body.elevationLossM ?? null,
        elevation_profile: body.elevationProfile,
        segments:          body.segments ?? [],
      })
      .select('id')
      .single()

    if (error) {
      console.error('[api/parcours] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[api/parcours]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── GET : liste les parcours de l'utilisateur ────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('parcours')
      .select('id, name, total_km, elevation_gain_m, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ parcours: data ?? [] })
  } catch (err) {
    console.error('[api/parcours GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
