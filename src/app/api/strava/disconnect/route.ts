import { NextResponse } from 'next/server'
import { disconnectStrava, getValidToken } from '@/lib/strava/tokens'
import { createPublicClient } from '@/lib/supabase/server'

// POST /api/strava/disconnect
// Révoque le token Strava + supprime les tokens en DB
export async function POST() {
  const supabase = await createPublicClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Révocation du token côté Strava (best-effort)
    const token = await getValidToken(user.id)
    if (token) {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token.access_token}` },
      }).catch(() => {}) // ignore errors — on supprime quand même en local
    }

    await disconnectStrava(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
