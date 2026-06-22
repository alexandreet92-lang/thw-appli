// ══════════════════════════════════════════════════════════════════
// Garde admin — SERVEUR UNIQUEMENT. À n'importer que dans des Server
// Components / Route Handlers. Vérifie l'identité réelle de l'utilisateur
// authentifié contre ADMIN_EMAIL (variable d'env NON publique).
// Fail-closed : si ADMIN_EMAIL n'est pas configurée, personne n'est admin.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface AdminCheck {
  ok: boolean
  status: 200 | 401 | 403
  email: string | null
}

function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return email.toLowerCase() === admin.toLowerCase()
}

/** Vérifie l'utilisateur courant. 401 = non connecté, 403 = connecté mais pas admin. */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, email: null }
  if (!isAdminEmail(user.email)) return { ok: false, status: 403, email: user.email ?? null }
  return { ok: true, status: 200, email: user.email ?? null }
}
