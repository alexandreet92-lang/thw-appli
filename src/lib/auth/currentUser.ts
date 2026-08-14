import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Utilisateur courant PARTAGÉ et mémoïsé. Avant : ~12 cartes du dashboard
// appelaient chacune supabase.auth.getUser() = 12 allers-retours RÉSEAU au
// serveur d'auth (lent, surtout sur l'app native cross-origin).
// Ici : un seul getSession() (LOCAL, localStorage → instantané), partagé par
// tous les appelants. Le cache est vidé à chaque changement d'auth.
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
  const p: Promise<User | null> = createClient().auth.getSession()
    .then(({ data }: { data: { session: Session | null } }) => data.session?.user ?? null)
    .catch(() => { cache = null; return null })
  cache = p
  return p
}
