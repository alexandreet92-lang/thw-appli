import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ── Admin check helpers ────────────────────────────────────────
// ADMIN_EMAIL       : serveur uniquement (jamais exposé au client)
// NEXT_PUBLIC_ADMIN_EMAIL : client (hide UI seulement, pas de sécu réelle)

export function isAdmin(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Vérifie que l'utilisateur connecté est admin.
 * Retourne un NextResponse 403 si non autorisé, null si OK.
 * Usage : const denied = await requireAdmin(supabase); if (denied) return denied;
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
    // Log la tentative sans révéler pourquoi
    console.warn(
      `[marketing] Accès refusé — tentative par : ${user.email ?? "inconnu"}`
    );
    // 404 pour ne pas révéler l'existence de l'endpoint
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return null; // accès autorisé
}
