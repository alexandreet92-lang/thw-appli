// Préférences IA de l'utilisateur connecté (table user_settings).
// GET   → { ai_web_search_default }
// PATCH → body { ai_web_search_default?: boolean }
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Champs autorisés en écriture (whitelist anti-injection).
const ALLOWED = ['ai_web_search_default'] as const

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const sb = createServiceClient()
    const { data } = await sb
      .from('user_settings')
      .select('ai_web_search_default')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      ai_web_search_default: data?.ai_web_search_default ?? false,
    })
  } catch (e) {
    console.error('[user/ai-settings GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as Record<string, unknown>
    const safe: Record<string, boolean> = {}
    for (const key of ALLOWED) {
      if (typeof body[key] === 'boolean') safe[key] = body[key] as boolean
    }
    if (Object.keys(safe).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
    }

    const sb = createServiceClient()
    const { data, error } = await sb
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...safe, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select('ai_web_search_default')
      .single()

    if (error) {
      console.error('[user/ai-settings PATCH] upsert', error)
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
    }

    return NextResponse.json({ ai_web_search_default: data?.ai_web_search_default ?? false })
  } catch (e) {
    console.error('[user/ai-settings PATCH]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
