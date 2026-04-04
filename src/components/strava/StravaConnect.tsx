'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useStrava } from '@/hooks/useStrava'

const STATUS_MESSAGES: Record<string, { msg: string; ok: boolean }> = {
  connected:     { msg: 'Strava connecté avec succès !',         ok: true  },
  denied:        { msg: 'Connexion annulée.',                    ok: false },
  error:         { msg: 'Erreur de connexion Strava.',           ok: false },
  token_error:   { msg: 'Erreur d\'authentification Strava.',    ok: false },
  invalid_state: { msg: 'Erreur de sécurité — réessaye.',        ok: false },
  no_session:    { msg: 'Session expirée — reconnecte-toi.',     ok: false },
}

export function StravaConnect() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { connected, syncing, sync, disconnect, activities } = useStrava()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Affiche le toast après le callback OAuth
  useEffect(() => {
    const s = searchParams.get('strava')
    if (!s || !STATUS_MESSAGES[s]) return
    setToast(STATUS_MESSAGES[s])
    setTimeout(() => setToast(null), 4000)
    router.replace('/profile')
  }, [searchParams, router])

  return (
    <>
      {/* Toast de notification */}
      {toast && (
        <div style={{
          position:      'fixed',
          top:           20,
          right:         20,
          zIndex:        999,
          padding:       '12px 18px',
          borderRadius:  12,
          background:    toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border:        `1px solid ${toast.ok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color:         toast.ok ? '#22c55e' : '#ef4444',
          fontSize:      13,
          fontWeight:    600,
          backdropFilter:'blur(8px)',
          fontFamily:    'DM Sans, sans-serif',
        }}>
          {toast.msg}
        </div>
      )}

      {connected ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={sync}
            disabled={syncing}
            style={{
              padding:    '6px 14px',
              borderRadius: 9,
              background: 'rgba(252,76,2,0.10)',
              border:     '1px solid rgba(252,76,2,0.3)',
              color:      '#FC4C02',
              fontSize:   11,
              fontWeight: 600,
              cursor:     syncing ? 'not-allowed' : 'pointer',
              opacity:    syncing ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {syncing ? '⟳ Sync en cours…' : '↻ Synchroniser'}
          </button>

          <button
            onClick={disconnect}
            style={{
              padding:    '6px 14px',
              borderRadius: 9,
              background: 'rgba(239,68,68,0.08)',
              border:     '1px solid rgba(239,68,68,0.2)',
              color:      '#ef4444',
              fontSize:   11,
              fontWeight: 600,
              cursor:     'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Déconnecter
          </button>

          {activities.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
              {activities.length} activité{activities.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={() => { window.location.href = '/api/auth/strava/connect' }}
          style={{
            padding:     '8px 18px',
            borderRadius: 9,
            background:  '#FC4C02',
            border:      'none',
            color:       '#fff',
            fontSize:    12,
            fontWeight:  700,
            cursor:      'pointer',
            display:     'flex',
            alignItems:  'center',
            gap:         8,
            fontFamily:  'DM Sans, sans-serif',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="white"/>
            <path d="M11.214 13.828l2.084-4.116 2.089 4.116h3.066L13.298 3.656l-5.15 10.172h3.066z" fill="white"/>
          </svg>
          Connecter Strava
        </button>
      )}
    </>
  )
}
