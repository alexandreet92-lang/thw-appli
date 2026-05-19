import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export interface ConnectionInfo {
  provider:     string
  last_used_at: string | null
  updated_at:   string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: [] })

  const db = createServiceClient()
  const { data } = await db
    .from('oauth_tokens')
    .select('provider, last_used_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const connected: ConnectionInfo[] = (data ?? []).map((r: { provider: string; last_used_at: string | null; updated_at: string | null }) => ({
    provider:     r.provider,
    last_used_at: r.last_used_at,
    updated_at:   r.updated_at,
  }))

  return NextResponse.json({ connected })
}
