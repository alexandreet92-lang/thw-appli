import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/marketing/auth";

export const runtime = "nodejs";

async function makeSupabaseAndCheck() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  // ── Admin-only ─────────────────────────────────────────────
  const denied = await requireAdmin(supabase);
  const { data: { user } } = await supabase.auth.getUser();

  return { supabase, user, denied };
}

export async function POST(req: Request) {
  const { supabase, user, denied } = await makeSupabaseAndCheck();
  if (denied) return denied;

  const body = await req.json() as { content?: unknown; context?: unknown };
  const { content, context } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("marketing_raw_ideas")
    .insert({
      user_id: user!.id,
      content: content.trim(),
      context: typeof context === "string" ? context.trim() || null : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idea: data });
}

export async function GET() {
  const { supabase, user, denied } = await makeSupabaseAndCheck();
  if (denied) return denied;

  const { data, error } = await supabase
    .from("marketing_raw_ideas")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ideas: data ?? [] });
}

export async function DELETE(req: Request) {
  const { supabase, user, denied } = await makeSupabaseAndCheck();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const { error } = await supabase
    .from("marketing_raw_ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
