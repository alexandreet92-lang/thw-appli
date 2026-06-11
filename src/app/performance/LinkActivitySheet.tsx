'use client'
// Surpage « Lier une activité » (createPortal). Liste les activités du sport du segment
// (recherche + liste : nom, date, distance, durée, métriques clés réelles). DS : neutre,
// tokens uniquement, action en var(--primary).
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchActivities, fmtDate, summaryLine, type ActivityLite, type Segment } from './triActivities'

const SEG_LABEL: Record<Segment, string> = { swim: 'Natation', bike: 'Vélo', run: 'Course' }
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de surpage (scrim)

export function LinkActivitySheet({ segment, onClose, onLink }: {
  segment: Segment
  onClose: () => void
  onLink: (a: ActivityLite) => void
}) {
  const [acts, setActs] = useState<ActivityLite[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => { void fetchActivities(segment).then(setActs) }, [segment])

  const filtered = useMemo(() => {
    if (!acts) return []
    const s = q.trim().toLowerCase()
    if (!s) return acts
    return acts.filter(a => (a.title ?? '').toLowerCase().includes(s) || fmtDate(a.started_at).toLowerCase().includes(s))
  }, [acts, q])

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3200, background: SCRIM, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxHeight: '88vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Lier une activité — {SEG_LABEL[segment]}
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {/* Recherche */}
        <div style={{ padding: '12px 20px 0' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (nom, date)…"
            className="rec-drawer"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
          {acts === null ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)' }}>Aucune activité {SEG_LABEL[segment].toLowerCase()} trouvée.</p>
          ) : filtered.map(a => (
            <button key={a.id} onClick={() => { onLink(a); onClose() }}
              style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 6, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card2)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title ?? 'Sans titre'}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtDate(a.started_at)}</span>
              </div>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)' }}>{summaryLine(segment, a) || '—'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
