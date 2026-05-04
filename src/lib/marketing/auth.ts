import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ── Admin check helpers ────────────────────────────────────────
// ADMIN_EMAIL            : serveur uniquement (jamais exposé au client)
// NEXT_PUBLIC_ADMIN_EMAIL : fallback si ADMIN_EMAIL absent

export function isAdmin(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) return false;
  if (!email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Vérifie que l'utilisateur connecté est admin.
 * Retourne un NextResponse si non autorisé, null si OK.
 * En cas de refus, log en détail dans les logs Vercel pourquoi.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[marketing/auth] getUser() error:", authError.message);
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!user) {
    console.warn("[marketing/auth] Requête sans session utilisateur.");
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  // ── Cas 1 : variable d'env manquante ──────────────────────────
  if (!adminEmail) {
    console.error(
      "[marketing/auth] ❌ ADMIN_EMAIL n'est PAS défini dans les variables d'environnement Vercel.",
      "→ Action requise : Settings > Environment Variables > ajouter ADMIN_EMAIL=votre@email.com",
      `(user authentifié : ${user.email ?? "inconnu"})`
    );
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Cas 2 : email ne correspond pas ───────────────────────────
  if (!isAdmin(user.email)) {
    console.warn(
      `[marketing/auth] Accès refusé — user: "${user.email ?? "inconnu"}" ≠ admin: "${adminEmail.substring(0, 3)}***"`
    );
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Accès autorisé ────────────────────────────────────────────
  console.log(`[marketing/auth] ✅ Accès autorisé — ${user.email}`);
  return null;
}
