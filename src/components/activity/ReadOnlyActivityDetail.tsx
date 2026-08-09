'use client'
// ══════════════════════════════════════════════════════════════════
// ReadOnlyActivityDetail — ouvre l'activité d'un AUTRE athlète EXACTEMENT
// comme la page training (carte interactive + stats + courbes + donuts +
// comparatif intervalles + tours), mais 100 % LECTURE SEULE : aucune écriture,
// aucune édition, aucun bouton d'analyse IA. Le lien « Voir sur Strava » reste.
// Hydrate la ligne complète via la RPC sécurisée (confidentialité respectée).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ActivityDetail } from '@/app/activities/page'
import { getActivityDetailRow } from '@/lib/profile/activityShowcase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyActivity = any
const EMPTY_PROFILE = { weight_kg: null, birth_date: null }

export function ReadOnlyActivityDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [row, setRow] = useState<AnyActivity | null>(null)
  const [failed, setFailed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    let off = false
    setRow(null); setFailed(false)
    void getActivityDetailRow(id)
      .then(r => { if (!off) { if (r) setRow(r); else setFailed(true) } })
      .catch(() => { if (!off) setFailed(true) })
    return () => { off = true }
  }, [id])

  // Overlay de chargement / d'erreur (avant hydratation) — plein écran, fermable.
  if (!row) {
    if (!mounted) return null
    return createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 15000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 14, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
          {failed ? 'Analyse détaillée indisponible pour cette activité.' : 'Chargement de l’analyse…'}
        </p>
      </div>,
      document.body,
    )
  }

  return (
    <ActivityDetail
      a={row as AnyActivity}
      onClose={onClose}
      zones={(row.zones as AnyActivity) ?? []}
      profile={EMPTY_PROFILE}
      allActivities={[]}
      readOnly
    />
  )
}
