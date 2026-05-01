// ══════════════════════════════════════════════════════════════════
// QUOTA MIDDLEWARE — HOF qui wrape les handlers de routes API Next.js
//
// Usage :
//   export const POST = withQuotaCheck('message')(async (req) => { ... })
//
// Le handler n'est PAS modifié — on intégre le middleware sans toucher
// aux routes existantes dans cette étape P0.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkQuota, logUsage, type UsageType } from './check-quota'

// ── Types ──────────────────────────────────────────────────────────

// Compatible avec les handlers App Router (avec ou sans params dynamiques)
type RouteContext = { params?: Promise<Record<string, string>> }
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>

export interface QuotaMiddlewareOptions {
  /**
   * Métadonnées supplémentaires à logger (builder appelé APRÈS succès du handler).
   * Peut lire le body de la requête, donc ne pas utiliser req.json() en double dans le handler.
   */
  buildMetadata?: (req: NextRequest) => Record<string, unknown>
}

// ── Middleware principal ────────────────────────────────────────────

/**
 * Higher-order function qui ajoute la vérification de quota sur un handler.
 *
 * Flux :
 *  1. Authentifier l'utilisateur via cookie Supabase
 *  2. checkQuota(userId, type)
 *  3. Si dépassé → 429 avec détails
 *  4. Si OK → exécuter handler
 *  5. Si réponse 2xx → logUsage (non-bloquant)
 */
export function withQuotaCheck(
  type: UsageType,
  options: QuotaMiddlewareOptions = {},
) {
  return function (handler: RouteHandler): RouteHandler {
    return async function (req: NextRequest, ctx: RouteContext): Promise<Response> {

      // ── 1. Auth ────────────────────────────────────────────────
      let userId: string
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }
        userId = user.id
      } catch (err) {
        console.error('[quota-middleware] auth error:', err)
        return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 })
      }

      // ── 2. Vérification quota ──────────────────────────────────
      let quota
      try {
        quota = await checkQuota(userId, type)
      } catch (err) {
        // En cas d'erreur de quota (DB down, etc.) → fail open pour ne pas bloquer les users
        console.error('[quota-middleware] checkQuota error, failing open:', err)
        return handler(req, ctx)
      }

      // ── 3. Quota dépassé → 429 ─────────────────────────────────
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: 'Quota mensuel dépassé',
            type,
            used: quota.used,
            limit: quota.limit,
            tier: quota.tier,
            reset_at: quota.reset_at,
            upgrade_url: '/settings/subscription',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit':     String(quota.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset':     quota.reset_at,
              'Retry-After':           quota.reset_at,
            },
          },
        )
      }

      // ── 4. Exécution du handler ────────────────────────────────
      const response = await handler(req, ctx)

      // ── 5. Log usage si succès (2xx) ───────────────────────────
      if (response.status >= 200 && response.status < 300) {
        const metadata: Record<string, unknown> = {
          quota_used_before: quota.used,
          quota_limit: quota.limit,
          tier: quota.tier,
        }
        if (options.buildMetadata) {
          try {
            Object.assign(metadata, options.buildMetadata(req))
          } catch { /* non-bloquant */ }
        }
        // Fire-and-forget — ne pas await pour ne pas ralentir la réponse
        void logUsage(userId, type, metadata)
      }

      return response
    }
  }
}

// ── Helpers de composition ─────────────────────────────────────────

/**
 * Vérifie le quota et log l'usage sans wrapper de handler.
 * Utile dans les handlers de streaming (SSE) où on ne peut pas
 * intercepter la réponse après coup.
 *
 * Usage :
 *   const check = await enforceQuota(userId, 'message')
 *   if (!check.allowed) return quotaExceededResponse(check)
 *   // ... appel IA ...
 *   await logUsage(userId, 'message', { model: 'sonnet' })
 */
export async function enforceQuota(
  userId: string,
  type: UsageType,
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  let quota
  try {
    quota = await checkQuota(userId, type)
  } catch {
    return { allowed: true } // fail open
  }

  if (!quota.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Quota mensuel dépassé',
          type,
          used: quota.used,
          limit: quota.limit,
          tier: quota.tier,
          reset_at: quota.reset_at,
          upgrade_url: '/settings/subscription',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(quota.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':     quota.reset_at,
          },
        },
      ),
    }
  }

  return { allowed: true }
}
