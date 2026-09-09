'use client'
// ══════════════════════════════════════════════════════════════════════════
// « Inviter » : invite dans l'espace des personnes que l'on suit / connaît.
// Liste les abonnements (par défaut) + recherche. Sélection multiple → envoie
// une invitation (notification + lien) via /api/community/invite.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { listFollowing, searchPeople, type Person } from '@/lib/social/follows'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function InviteSheet({ spaceId, spaceName, onClose }: {
  spaceId: string; spaceName?: string; onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }

  // Liste par défaut = mes abonnements ; recherche = tous les profils.
  useEffect(() => {
    let alive = true
    const term = q.trim()
    const run = term ? searchPeople(term, 25) : listFollowing(100)
    void run.then(list => { if (alive) setPeople(list) })
    return () => { alive = false }
  }, [q])

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function invite() {
    if (selected.size === 0 || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/community/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, userIds: Array.from(selected) }),
      })
      const data = await res.json().catch(() => ({}))
      setDone(typeof data?.invited === 'number' ? data.invited : selected.size)
      setTimeout(requestClose, 1100)
    } catch { setBusy(false) }
  }

  const list = useMemo(() => people ?? [], [people])
  if (!mounted || typeof document === 'undefined') return null

  const body = (
    <>
      {isNarrow && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-2)' }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>
      )}
      <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{t('w1g.ch.inviteTitle')}</h2>
      <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 var(--space-4)' }}>{spaceName ? `· ${spaceName}` : t('w1g.ch.inviteSub')}</p>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('w1g.ch.inviteSearch')}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none', marginBottom: 'var(--space-3)' }} />

      <div style={{ minHeight: 120, maxHeight: isNarrow ? '48dvh' : 340, overflowY: 'auto', margin: '0 calc(-1 * var(--space-2))' }}>
        {people === null ? (
          <p style={{ textAlign: 'center', fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', padding: 'var(--space-5)' }}>…</p>
        ) : list.length === 0 ? (
          <p style={{ textAlign: 'center', fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', padding: 'var(--space-5)' }}>{q.trim() ? t('w1g.ch.inviteNoResult') : t('w1g.ch.inviteNoFollowing')}</p>
        ) : list.map(p => {
          const on = selected.has(p.id)
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', background: on ? 'var(--surface-neutral)' : 'transparent', cursor: 'pointer', borderRadius: 'var(--r-md)', padding: 'var(--space-2) var(--space-2)' }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontFamily: FB, fontWeight: 600, fontSize: 15 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.slice(0, 1).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.username && <span style={{ display: 'block', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>@{p.username}</span>}
              </span>
              <span aria-hidden style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: on ? 'var(--primary)' : 'var(--surface-neutral)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <button onClick={requestClose} style={{ flex: '0 0 auto', height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.cancel')}</button>
        <button onClick={() => void invite()} disabled={selected.size === 0 || busy || done !== null}
          style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: selected.size && !busy ? 'pointer' : 'default', opacity: selected.size && !busy && done === null ? 1 : 0.6 }}>
          {done !== null ? t('w1g.ch.invited', { n: done }) : busy ? t('w1g.creating') : selected.size ? t('w1g.ch.inviteN', { n: selected.size }) : t('w1g.ch.invite')}
        </button>
      </div>
    </>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15500, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div role="dialog" aria-modal="true" style={isNarrow ? {
        position: 'relative', width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 40px)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: 'var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom, 0px))',
      } : {
        position: 'relative', width: '100%', maxWidth: 440, maxHeight: 'calc(100dvh - 80px)',
        background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'scale(1)' : 'scale(0.96)', opacity: shown && !closing ? 1 : 0,
        transition: 'transform 0.22s ease, opacity 0.22s ease', padding: 'var(--space-6)',
      }}>
        {body}
      </div>
    </div>,
    document.body,
  )
}
