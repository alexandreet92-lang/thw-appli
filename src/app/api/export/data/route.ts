// ══════════════════════════════════════════════════════════════
// GET /api/export/data — export RGPD (portabilité).
// Renvoie l'ensemble des données de l'utilisateur connecté en un
// fichier JSON téléchargeable. Chaque table est lue via le client
// authentifié (RLS = uniquement ses propres lignes) ; toute table
// absente ou en erreur est ignorée sans casser l'export.
// ══════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Tables détenues par l'utilisateur (clé = colonne d'appartenance).
const USER_TABLES: { name: string; key: string }[] = [
  { name: 'profiles',                     key: 'id' },
  { name: 'athlete_performance_profile',  key: 'user_id' },
  { name: 'activities',                   key: 'user_id' },
  { name: 'planned_sessions',             key: 'user_id' },
  { name: 'training_plans',               key: 'user_id' },
  { name: 'planned_races',                key: 'user_id' },
  { name: 'injuries',                     key: 'user_id' },
  { name: 'metrics_daily',                key: 'user_id' },
  { name: 'nutrition_plans',              key: 'user_id' },
  { name: 'ai_rules',                     key: 'user_id' },
  { name: 'user_competences',             key: 'user_id' },
  { name: 'ai_conversations',             key: 'user_id' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const data: Record<string, unknown> = {}
  for (const { name, key } of USER_TABLES) {
    try {
      const { data: rows, error } = await supabase.from(name).select('*').eq(key, user.id)
      if (!error) data[name] = rows ?? []
    } catch {
      /* table absente ou inaccessible → ignorée */
    }
  }

  const payload = {
    export_meta: {
      app: 'THW Coaching',
      user_id: user.id,
      email: user.email ?? null,
      generated_at: new Date().toISOString(),
      format: 'json',
      note: "Export de portabilité RGPD — copie de tes données personnelles.",
    },
    data,
  }

  const filename = `thw-export-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
