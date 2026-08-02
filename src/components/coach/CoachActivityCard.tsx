'use client'
// ══════════════════════════════════════════════════════════════════
// Côté ATHLÈTE : transparence sur le coach. Interrupteur de consentement
// (autoriser / couper les modifications du coach) + journal des dernières
// modifications faites par le coach. Ne s'affiche que si l'athlète a un coach.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyCoachLink, setCoachWriteConsent, listCoachChanges, type CoachChange } from '@/lib/coach/consent'

export function CoachActivityCard() {
  const [hasCoach, setHasCoach] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(true)
  const [changes, setChanges] = useState<CoachChange[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const link = await getMyCoachLink()
      if (!alive) return
      if (!link) { setHasCoach(false); return }
      setHasCoach(true); setEnabled(link.writeEnabled)
      setChanges(await listCoachChanges(6))
    })()
    return () => { alive = false }
  }, [])

  if (hasCoach === null) return null
  // Pas de coach → invitation à en trouver un (annuaire).
  if (hasCoach === false) {
    return (
      <Link href="/coaches" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', textDecoration: 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Trouver un coach</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>Fais-toi accompagner : parcours les coachs et envoie ta demande.</p>
        </div>
        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>→</span>
      </Link>
    )
  }

  const toggle = async () => {
    const next = !enabled
    setEnabled(next); setSaving(true)
    try { await setCoachWriteConsent(next) } catch { setEnabled(!next) } finally { setSaving(false) }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Ton coach</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {enabled ? 'Ton coach peut ajuster ton planning et ta nutrition.' : 'Les modifications par ton coach sont en pause.'}
          </p>
        </div>
        <button role="switch" aria-checked={enabled} aria-label="Autoriser les modifications du coach" onClick={toggle} disabled={saving}
          style={{ flexShrink: 0, width: 44, height: 26, borderRadius: 999, border: 'none', cursor: saving ? 'default' : 'pointer', background: enabled ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 160ms' }}>
          <span style={{ position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
        </button>
      </div>

      {changes.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>Modifications récentes</p>
          {changes.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, transform: 'translateY(-1px)' }} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)' }}>{c.summary ?? c.page ?? c.action}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', flexShrink: 0 }}>{fmt(c.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
