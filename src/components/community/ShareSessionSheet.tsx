'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager une séance » : liste mes séances de bibliothèque ; en choisir
// une la poste dans le canal (carte cliquable → détail, copiable/planifiable).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { listMyLibrarySessions, type LibrarySession } from '@/lib/community/sessions'
import { sportColor, sportLabel } from '@/components/recovery/helpers'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtDuration(min: number | null): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function fmtLine(s: LibrarySession): string {
  const bits: string[] = [sportLabel(s.sport)]
  const d = fmtDuration(s.durationMin); if (d) bits.push(d)
  if (s.blocks.length) bits.push(`${s.blocks.length} bloc${s.blocks.length > 1 ? 's' : ''}`)
  if (s.rpe) bits.push(`RPE ${s.rpe}`)
  return bits.join(' · ')
}

export function ShareSessionSheet({ onClose, onShare }: {
  onClose: () => void; onShare: (s: LibrarySession) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<LibrarySession[] | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { void listMyLibrarySessions(40).then(setItems) }, [])
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
        <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>Partager une séance</h2>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items === null ? (
            [0, 1, 2, 3].map(i => <span key={i} style={{ height: 52, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />)
          ) : items.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: 'var(--space-6)' }}>Aucune séance dans ta bibliothèque pour l&apos;instant.</p>
          ) : items.map(s => (
            <button key={s.id} onClick={() => onShare(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-3)', background: 'var(--bg-card2)', fontFamily: FB }}>
              <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: sportColor(s.sport), flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                <span className="tnum" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtLine(s)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}
