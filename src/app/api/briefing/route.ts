// ══════════════════════════════════════════════════════════════
// /api/briefing
//   GET   → retourne le briefing du jour pour l'utilisateur connecté
//           (null si pas de briefing aujourd'hui)
//   PATCH → marque le briefing du jour comme lu (lu=true)
//
// Utilise le client Supabase SSR standard — les policies RLS
// restreignent naturellement l'accès aux données du user connecté.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Retourne la date du jour au format ISO YYYY-MM-DD (timezone locale serveur).
function todayIso(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const date = todayIso()

  const { data, error } = await sb
    .from('daily_briefing')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (error) {
    console.log('[briefing GET] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ briefing: data ?? null })
}

// ── PATCH ────────────────────────────────────────────────────
export async function PATCH(): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const date = todayIso()

  const { data, error } = await sb
    .from('daily_briefing')
    .update({ lu: true })
    .eq('user_id', user.id)
    .eq('date', date)
    .select()
    .maybeSingle()

  if (error) {
    console.log('[briefing PATCH] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // data = null si aucun briefing n'existait pour aujourd'hui
  return NextResponse.json({ briefing: data ?? null })
}
