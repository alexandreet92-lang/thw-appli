import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeToken } from '@/lib/oauth/tokens'
import { OAuthProvider } from '@/lib/oauth/config'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = req.nextUrl.searchParams.get('provider') as OAuthProvider
  if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 })

  await revokeToken(user.id, provider)
  return NextResponse.json({ success: true })
}
