import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Utilisateur courant PARTAGÉ et mémoïsé. Avant : ~12+ cartes du dashboard (et
// désormais des dizaines de composants) appelaient chacune supabase.auth.getUser()
// = un aller-retour RÉSEAU au serveur d'auth par appel (lent, et surtout : ça
// pilonnait la base — voir pg_stat_statements). Ici : un seul getSession()
// (LOCAL, localStorage → instantané), partagé par tous les appelants.
//
// ROBUSTESSE CRITIQUE : comme des dizaines de composants dépendent de CE cache,
// une promesse qui se bloquerait figerait TOUTE l'app (squelettes éternels).
// Donc : (1) borne dure de 3 s sur getSession — au-delà on renvoie null plutôt
// que de rester bloqué ; (2) on ne CACHE JAMAIS durablement un résultat null /
// timeout (on réessaie au prochain appel). Le cache n'est conservé que pour un
// utilisateur RÉEL, et invalidé à chaque changement d'auth.
let cache: Promise<User | null> | null = null
let listening = false

function ensureListener(): void {
  if (listening) return
  listening = true
  try {
    createClient().auth.onAuthStateChange(() => { cache = null })
  } catch { /* SSR : pas de window */ }
}

export function getCurrentUser(): Promise<User | null> {
  ensureListener()
  if (cache) return cache
  const p: Promise<User | null> = (async () => {
    try {
      const sb = createClient()
      const TIMEOUT = Symbol('t')
      const res = await Promise.race([
        sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => data.session?.user ?? null),
        new Promise<typeof TIMEOUT>(r => setTimeout(() => r(TIMEOUT), 3000)),
      ])
      return res === TIMEOUT ? null : res
    } catch { return null }
  })()
  cache = p
  // On ne garde en cache QUE si un vrai utilisateur revient : sinon (null /
  // timeout / erreur) on invalide pour réessayer au prochain appel, et surtout
  // pour NE JAMAIS laisser une promesse « morte » figer les composants.
  void p.then(u => { if (!u) cache = null }).catch(() => { cache = null })
  return p
}
