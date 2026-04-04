import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client Supabase authentifié — pour les API routes (lit les cookies de session)
// Utilise la clé anonyme + cookies → getUser() fonctionne correctement
export async function createPublicClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // API routes ne peuvent pas modifier les cookies — ignoré
          }
        },
      },
    }
  )
}

// Client service role — pour les opérations server-to-server (bypasse RLS)
// NE JAMAIS exposer côté client
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
