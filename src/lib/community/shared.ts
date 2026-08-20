'use client'
// ══════════════════════════════════════════════════════════════════════════
// Helpers partagés de la lib Communauté (côté client).
// Conventions (alignées sur src/lib/messages/groups.ts) :
//   - client navigateur via createClient() par appel (pas de client module) ;
//   - erreurs encodées dans le type de retour (pas de throw) ;
//   - profils batchés en une requête .in('id', ids) → évite le N+1.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

/** Id de l'utilisateur courant, ou null. */
export async function myId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

export interface PersonRef { name: string; avatar: string | null }

/** Résout nom + avatar pour un lot d'ids utilisateurs, en une seule requête. */
export async function namesFor(ids: string[]): Promise<Map<string, PersonRef>> {
  const map = new Map<string, PersonRef>()
  const unique = Array.from(new Set(ids)).filter(Boolean)
  if (unique.length === 0) return map
  const { data } = await createClient()
    .from('profiles')
    .select('id, full_name, first_name, avatar_url')
    .in('id', unique)
  for (const row of (data ?? []) as { id: string; full_name: string | null; first_name: string | null; avatar_url: string | null }[]) {
    map.set(row.id, {
      name: (row.full_name || row.first_name || 'Membre').trim(),
      avatar: row.avatar_url,
    })
  }
  return map
}
