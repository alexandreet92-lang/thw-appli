'use client'
// ══════════════════════════════════════════════════════════════════
// Côté ATHLÈTE : entrée self-service vers l'espace coach.
//  • jamais coach → « Deviens coach — 14 jours d'essai gratuit » (démarre l'essai)
//  • essai terminé sans pack → pousse vers les packs coach
//  • déjà coach (essai en cours / payant) → rien (la bascule d'interface suffit)
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoachAccess, refreshCoachAccess } from '@/hooks/useCoachAccess'
import { startCoachTrial } from '@/lib/coach/owner'
import { useI18n } from '@/lib/i18n'

export function BecomeCoachCard() {
  const router = useRouter()
  const { t } = useI18n()
  const s = useCoachAccess()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (s.loading || s.access) return null

  const start = async () => {
    setBusy(true); setErr(null)
    // On ne navigue vers /coach QU'APRÈS confirmation que l'essai a démarré
    // (sinon le middleware renverrait aussitôt vers /coach/subscription).
    try { await startCoachTrial(); refreshCoachAccess(); router.push('/coach') }
    catch { setErr(t('w3d.trial_start_error')); setBusy(false) }
  }

  const expired = s.expired
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {expired ? t('w3d.trial_ended_title') : t('w3d.become_coach_title')}
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>
          {expired
            ? t('w3d.trial_ended_desc')
            : t('w3d.become_coach_desc')}
        </p>
        {err && <p style={{ fontSize: 11.5, color: '#ef4444', margin: '6px 0 0', fontWeight: 600 }}>{err}</p>}
      </div>
      {expired ? (
        <button onClick={() => router.push('/coach/subscription')} style={cta}>{t('w3d.see_packs')}</button>
      ) : (
        <button onClick={start} disabled={busy} style={{ ...cta, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : t('w3d.try_14_days')}</button>
      )}
    </div>
  )
}

const cta: React.CSSProperties = {
  height: 40, padding: '0 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)',
  color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
}
