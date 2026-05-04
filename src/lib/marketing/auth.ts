import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ── Admin check helpers ────────────────────────────────────────
// ADMIN_EMAIL            : serveur uniquement (jamais exposé au client)
// NEXT_PUBLIC_ADMIN_EMAIL : client (hide UI seulement, pas de sécu réelle)

export function isAdmin(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    // Env var non configurée → personne n'est admin (log utile en debug)
    console.warn("[marketing/auth] ADMIN_EMAIL non défini — accès admin impossible pour tout le monde.");
    return false;
  }
  if (!email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Vérifie que l'utilisateur connecté est admin.
 * Retourne un NextResponse si non autorisé, null si OK.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!isAdmin(user.email)) {
    // Log détaillé côté serveur pour distinguer "env var absente" vs "mauvais email"
    const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("[marketing/auth] Accès refusé : ADMIN_EMAIL n'est pas défini dans les variables d'env Vercel.");
    } else {
      console.warn(`[marketing/auth] Accès refusé — user: ${user.email ?? "inconnu"}`);
    }
    // 404 pour ne pas révéler l'existence de l'endpoint aux tiers
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return null; // accès autorisé
}
