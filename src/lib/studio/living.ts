// ══════════════════════════════════════════════════════════════
// Studio — SYSTÈME VIVANT : contexte partagé injecté aux agents à chaque
// cycle, quel que soit le mode d'exécution (autonome = service client,
// manuel = client RLS). Deux briques :
//  • MÉMOIRE inter-cycles : la synthèse du dernier cycle réussi → l'IA
//    vérifie l'adhérence et progresse au lieu de recommencer.
//  • GARDE-FOU santé : blessure active ou récupération au plancher → l'IA
//    DOIT brider la charge. La sécurité prime sur l'objectif.
// ══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'

// Relit la synthèse du dernier run RÉUSSI de ce système.
export async function readLastCycleMemory(sb: SupabaseClient, systemId: string | null | undefined): Promise<string> {
  if (!systemId) return ''
  try {
    const { data } = await sb.from('studio_runs')
      .select('renders, finished_at')
      .eq('system_id', systemId).eq('status', 'done')
      .order('finished_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return ''
    const renders = (data.renders ?? []) as { title?: string; text?: string }[]
    const txt = renders.map(r => (r?.text ?? '').trim()).filter(Boolean).join('\n\n')
    return txt.slice(0, 2500)
  } catch { return '' }
}

// Détecte les signaux « santé » bruts (blessure active, récup au plancher).
// Renvoie une liste de motifs courts, réutilisable pour l'IA ET pour l'UI.
export async function detectHealthFlags(sb: SupabaseClient, userId: string): Promise<string[]> {
  const bits: string[] = []
  try {
    const { data: inj } = await sb.from('injuries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
    const RESOLVED = ['guérie', 'guerie', 'resolved', 'résolue', 'resolue', 'terminée', 'terminee']
    const active = ((inj ?? []) as Record<string, unknown>[]).filter(b => {
      const end = b.date_fin ?? b.resolved_date
      const status = String(b.status ?? '').toLowerCase()
      return !end && !RESOLVED.includes(status)
    })
    if (active.length) {
      const names = active.map(b => String(b.nom ?? b.name ?? b.title ?? b.zone ?? 'zone')).slice(0, 4).join(', ')
      bits.push(`blessure(s) active(s) : ${names}`)
    }
  } catch { /* best-effort */ }
  try {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    const { data: rec } = await sb.from('recovery_checkin').select('sleep_quality,fatigue,soreness').eq('user_id', userId).gte('date', since)
    const rows = (rec ?? []) as Record<string, number | null>[]
    if (rows.length >= 2) {
      const avg = (k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) / rows.length
      const fatigue = avg('fatigue'), soreness = avg('soreness'), sleep = avg('sleep_quality')
      if (fatigue >= 4 || soreness >= 4 || (sleep > 0 && sleep <= 2)) {
        bits.push('récupération au plancher (fatigue/courbatures élevées ou sommeil bas sur 7 jours)')
      }
    }
  } catch { /* best-effort */ }
  return bits
}

// Directive « garde-fou » injectée aux agents (vide si aucun signal).
export async function readHealthGuard(sb: SupabaseClient, userId: string): Promise<string> {
  const bits = await detectHealthFlags(sb, userId)
  if (!bits.length) return ''
  return `\n\n⚠️ GARDE-FOU SANTÉ ACTIF — ${bits.join(' ; ')}. Tu DOIS brider la charge : privilégie le repos ou une semaine d'allègement, évite toute intensité ou volume élevés, adapte ou reporte les séances dures, et explique clairement pourquoi. La sécurité de l'athlète prime sur l'objectif.`
}

// Bloc complet (garde-fou + mémoire) à ajouter au rôle de chaque agent.
export async function buildLivingContext(sb: SupabaseClient, userId: string, systemId: string | null | undefined): Promise<string> {
  const [memory, guard] = await Promise.all([
    readLastCycleMemory(sb, systemId),
    readHealthGuard(sb, userId),
  ])
  return `${guard}${memory ? `\n\n--- MÉMOIRE : ta synthèse du dernier cycle (vérifie l'adhérence, ajuste et progresse) ---\n${memory}\n--- fin mémoire ---` : ''}`
}
