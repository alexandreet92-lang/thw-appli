'use client'
// Surpage commentaires d'une activité (Fil) — liste + ajout + suppression.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '@/components/shared/Sidebar'
import { listComments, addComment, deleteComment, type ActivityComment } from '@/lib/social/kudos'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de surpage

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function CommentsSheet({ activityId, onClose, onCount }: { activityId: string; onClose: () => void; onCount: (n: number) => void }) {
  const [comments, setComments] = useState<ActivityComment[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const listEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { void listComments(activityId).then(setComments) }, [activityId])
  useEffect(() => { listEnd.current?.scrollIntoView({ block: 'end' }) }, [comments])

  const close = () => { setClosing(true); setTimeout(onClose, 220) }
  async function send() {
    const t = text.trim(); if (!t || sending) return
    setSending(true)
    try {
      const c = await addComment(activityId, t)
      if (c) { setComments(prev => { const next = [...(prev ?? []), c]; onCount(next.length); return next }); setText('') }
    } catch { /* ignore */ } finally { setSending(false) }
  }
  async function remove(id: string) {
    await deleteComment(id).catch(() => {})
    setComments(prev => { const next = (prev ?? []).filter(c => c.id !== id); onCount(next.length); return next })
  }

  return createPortal(
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'}
        style={{ width: '100%', maxWidth: 560, height: 'min(80dvh, 640px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Commentaires</h2>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {comments === null ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
          ) : comments.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Sois le premier à commenter.</p>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <Avatar url={c.avatar} name={c.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                  <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{relTime(c.createdAt)}</span>
                  {c.mine && <button onClick={() => void remove(c.id)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Supprimer</button>}
                </div>
                <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text)', margin: '2px 0 0', lineHeight: 1.5, wordBreak: 'break-word' }}>{c.body}</p>
              </div>
            </div>
          ))}
          <div ref={listEnd} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder="Ajouter un commentaire…" maxLength={2000}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 999, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13.5, outline: 'none' }} />
          <button onClick={() => void send()} disabled={!text.trim() || sending}
            style={{ padding: '0 16px', borderRadius: 999, border: 'none', background: text.trim() ? 'var(--primary)' : 'var(--bg-card2)', color: text.trim() ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
            Envoyer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
