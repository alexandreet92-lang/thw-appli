// ══════════════════════════════════════════════════════════════════
// STRAVA WEBHOOK SUBSCRIBE — src/app/api/strava/webhook-subscribe/route.ts
//
// Route admin à appeler UNE SEULE FOIS après déploiement pour
// créer l'abonnement push Strava.
//
// URL : https://thw-appli.vercel.app/api/strava/webhook-subscribe
// ══════════════════════════════════════════════════════════════════

export async function GET() {
  const callbackUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://thw-appli.vercel.app')
    + '/api/strava/webhook'

  const res = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url:  callbackUrl,
      verify_token:  process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    }),
  })

  const data = await res.json()
  console.log('[strava-webhook-subscribe]', data)
  return Response.json(data)
}
