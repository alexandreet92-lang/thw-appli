// Préférences de notifications de l'utilisateur connecté.
// GET   → { global_enabled, preferences }
// PATCH → body { global_enabled?: boolean, preferences?: Record<string,boolean> }
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const sb = createServiceClient()
    const { data } = await sb
      .from('user_notification_preferences')
      .select('global_enabled, preferences')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      global_enabled: data?.global_enabled ?? true,
      preferences: (data?.preferences as Record<string, boolean> | null) ?? {},
    })
  } catch (e) {
    console.error('[notifications/preferences GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as { global_enabled?: boolean; preferences?: Record<string, boolean> }
    const sb = createServiceClient()

    // Ligne existante (merge des préférences)
    const { data: existing } = await sb
      .from('user_notification_preferences')
      .select('global_enabled, preferences')
      .eq('user_id', user.id)
      .maybeSingle()

    const mergedPrefs = {
      ...((existing?.preferences as Record<string, boolean> | null) ?? {}),
      ...(body.preferences ?? {}),
    }
    const globalEnabled = typeof body.global_enabled === 'boolean'
      ? body.global_enabled
      : (existing?.global_enabled ?? true)

    const { error } = await sb
      .from('user_notification_preferences')
      .upsert(
        { user_id: user.id, global_enabled: globalEnabled, preferences: mergedPrefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (error) {
      console.error('[notifications/preferences PATCH] upsert', error)
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
    }

    return NextResponse.json({ global_enabled: globalEnabled, preferences: mergedPrefs })
  } catch (e) {
    console.error('[notifications/preferences PATCH]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
