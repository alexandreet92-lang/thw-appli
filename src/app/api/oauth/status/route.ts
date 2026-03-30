import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConnectedProviders } from '@/lib/oauth/tokens'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: [] })

  const connected = await getConnectedProviders(user.id)
  return NextResponse.json({ connected })
}
