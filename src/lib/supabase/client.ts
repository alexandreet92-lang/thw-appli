import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupaClient } from '@supabase/supabase-js'
import { emitSaved, emitSaveError } from '@/lib/ui/saveToast'

// App native (Capacitor) : le bundle tourne sur capacitor:// → les COOKIES ne
// persistent pas de façon fiable. On bascule donc sur un stockage localStorage
// (client supabase-js classique) UNIQUEMENT dans le build natif (NEXT_PUBLIC_API_BASE
// défini). Le web reste sur createBrowserClient (cookies, requis pour le SSR /
// middleware). La clé de stockage correspond exactement à celle lue par apiFetch.
const NATIVE = !!process.env.NEXT_PUBLIC_API_BASE
function nativeStorageKey(): string {
  try { return `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token` }
  catch { return 'sb-auth-token' }
}

// Méthodes qui MODIFIENT des données → déclenchent l'animation « Enregistré ».
// (les lectures `select` ne sont pas instrumentées.)
const MUTATIONS = new Set(['insert', 'update', 'upsert', 'delete'])

// Tables écrites EN ARRIÈRE-PLAN (auto-save du chat, journaux de sync, quotas…).
// Leurs échecs ne doivent JAMAIS afficher la pastille rouge « Échec de
// l'enregistrement » : ce sont des écritures techniques, sans rapport avec une
// action explicite de l'utilisateur (sinon fausses alertes, ex. au lancement
// d'une activité). Les vraies sauvegardes (profil, activité, parcours…) restent
// signalées normalement.
const SILENT_TABLES = new Set(['ai_conversations', 'sync_logs', 'token_usage', 'chat_messages',
  // Communauté : écritures fréquentes de chat (messages, réactions, marqueurs de
  // lecture) — pas de pastille « Enregistré » à chaque envoi.
  'community_messages', 'community_message_reactions', 'community_reads', 'community_members'])

/* eslint-disable @typescript-eslint/no-explicit-any */
// Enveloppe le builder de requête issu d'une mutation pour émettre un événement
// `thw:save` à la résolution. Les méthodes de filtre (eq, select, single…)
// renvoient le même builder → on ré-enveloppe via le proxy pour conserver le
// hook jusqu'au `await` final.
function wrapMutationBuilder(builder: any, silent: boolean): any {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return (onFulfilled?: (v: any) => any, onRejected?: (e: any) => any) =>
          target.then((res: any) => {
            if (res && res.error) { if (!silent) emitSaveError() }
            else if (!silent) emitSaved()
            return onFulfilled ? onFulfilled(res) : res
          }, onRejected)
      }
      const val = Reflect.get(target, prop, target)
      if (typeof val === 'function') {
        return (...args: any[]) => {
          const out = val.apply(target, args)
          // Les builders Supabase renvoient `this` → re-proxifier.
          return out === target ? receiver : out
        }
      }
      return val
    },
  })
}

export function createClient() {
  const client = NATIVE
    ? createSupaClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storageKey: nativeStorageKey(),
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          },
        }
      ) as ReturnType<typeof createBrowserClient>
    : createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

  const originalFrom = client.from.bind(client)
  client.from = ((table: string) => {
    const qb = originalFrom(table as any)
    const silent = SILENT_TABLES.has(table)
    return new Proxy(qb, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, target)
        if (typeof val === 'function' && MUTATIONS.has(prop as string)) {
          return (...args: any[]) => wrapMutationBuilder((val as any).apply(target, args), silent)
        }
        return typeof val === 'function' ? (val as any).bind(target) : val
      },
    }) as any
  }) as typeof client.from

  return client
}
