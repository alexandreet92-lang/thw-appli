'use client'
// ══════════════════════════════════════════════════════════════════════════
// Salon vocal (Phase 2, LiveKit). SCAFFOLD : le jeton est demandé à la route
// /api/community/voice-token. Tant que LiveKit n'est pas configuré (variables
// d'env), la route renvoie 501 → on affiche « activation requise ». Le client
// média (livekit-client) sera branché une fois le compte LiveKit créé.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import type { CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function VoiceView({ channel, isMember, isNarrow, onBack }: {
  channel: CommunityChannel; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'unconfigured' | 'forbidden' | 'error'>('idle')

  async function join() {
    setStatus('connecting')
    try {
      const res = await fetch('/api/community/voice-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId: channel.id }),
      })
      if (res.status === 501) { setStatus('unconfigured'); return }
      if (res.status === 403) { setStatus('forbidden'); return }
      if (!res.ok) { setStatus('error'); return }
      // Jeton obtenu : la connexion média LiveKit (livekit-client) sera branchée ici.
      setStatus('ready')
    } catch { setStatus('error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {isNarrow && (
          <button onClick={onBack} aria-label="Retour" style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>🔊 {channel.name}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
        <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Salon vocal</span>
        <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 380, lineHeight: 1.5 }}>
          {status === 'unconfigured'
            ? 'La voix arrive très bientôt : il reste à activer LiveKit côté serveur.'
            : status === 'forbidden'
              ? 'Les salons vocaux sont réservés à l\'abonnement Pro.'
              : status === 'ready'
                ? 'Connexion prête. Le client audio LiveKit se branche ici.'
                : status === 'error'
                  ? 'Connexion impossible pour l\'instant.'
                  : 'Rejoins le salon pour parler en direct avec les membres présents.'}
        </p>
        {isMember && (status === 'idle' || status === 'connecting' || status === 'error') && (
          <button onClick={() => void join()} disabled={status === 'connecting'}
            style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: status === 'connecting' ? 'default' : 'pointer', opacity: status === 'connecting' ? 0.6 : 1 }}>
            {status === 'connecting' ? 'Connexion…' : 'Rejoindre le salon vocal'}
          </button>
        )}
      </div>
    </div>
  )
}
