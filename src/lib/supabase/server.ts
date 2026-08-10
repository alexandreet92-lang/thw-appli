import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  // App native (Capacitor) : le bundle local appelle l'API en cross-origin depuis
  // capacitor:// → les cookies ne passent pas. Si un token Bearer est fourni, on
  // authentifie avec ce token (RLS appliquée). Le web continue via cookies.
  try {
    const h = await headers()
    const authz = h.get('authorization')
    if (authz && authz.toLowerCase().startsWith('bearer ')) {
      const token = authz.slice(7).trim()
      if (token) {
        return createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { autoRefreshToken: false, persistSession: false },
          }
        )
      }
    }
  } catch { /* headers() indisponible → on retombe sur les cookies */ }

  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )
}

// Alias pour compatibilité avec nos routes API
export const createPublicClient = createClient

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
