'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager une activité » : liste mes activités récentes ; en choisir
// une la poste dans le canal (carte cliquable pour moi, snapshot pour les autres).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { listMyRecentActivities } from '@/lib/community/activities'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import type { ActivityRef } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtLine(a: ActivityRef): string {
  const bits: string[] = []
  if (a.distanceM && a.distanceM > 0) bits.push(a.distanceM >= 1000 ? `${(a.distanceM / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(a.distanceM)} m`)
  if (a.durationS && a.durationS > 0) { const h = Math.floor(a.durationS / 3600), m = Math.round((a.durationS % 3600) / 60); bits.push(h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`) }
  try { bits.push(new Date(a.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) } catch { /* */ }
  return bits.join(' · ')
}

export function ShareActivitySheet({ onClose, onShare }: {
  onClose: () => void; onShare: (a: ActivityRef) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<ActivityRef[] | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { void listMyRecentActivities(25).then(setItems) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  const sheet = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', padding: 'var(--space-5) var(--space-5) var(--space-8)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-4)' }} />
        <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>Partager une activité</h2>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items === null ? (
            [0, 1, 2, 3].map(i => <span key={i} style={{ height: 52, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />)
          ) : items.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: 'var(--space-6)' }}>Aucune activité à partager pour l&apos;instant.</p>
          ) : items.map(a => (
            <button key={a.id} onClick={() => onShare(a)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-3)', background: 'var(--bg-card2)', fontFamily: FB }}>
              <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: sportColor(a.sport), flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || sportLabel(a.sport)}</span>
                <span className="tnum" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtLine(a)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}
