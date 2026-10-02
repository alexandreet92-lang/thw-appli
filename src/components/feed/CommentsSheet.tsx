'use client'
// Feuille commentaires d'une activité (Fil) — liste + ajout + suppression.
// Nouveau style : feuille du bas à ressort, avatars, envoi optimiste (le
// commentaire « monte »), champ pilule au-dessus du clavier.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, MessageCircle, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { listComments, addComment, deleteComment, type ActivityComment } from '@/lib/social/kudos'
import { CmSheet, CmAvatar, CmSkel, CmEmpty, FB, stagger } from '@/components/community/kit'

function relTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return t('w3f.just_now')
  if (s < 3600) return t('w3f.min_ago', { n: Math.floor(s / 60) })
  if (s < 86400) return t('w3f.hour_ago', { n: Math.floor(s / 3600) })
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function CommentsSheet({ activityId, onClose, onCount }: { activityId: string; onClose: () => void; onCount: (n: number) => void }) {
  const { t } = useI18n()
  const kb = useKeyboardInset()
  const [comments, setComments] = useState<ActivityComment[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const listEnd = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => { void listComments(activityId).then(setComments) }, [activityId])
  useLayoutEffect(() => {
    if (!comments) return
    listEnd.current?.scrollIntoView({ block: 'end', behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [comments])

  async function send() {
    const body = text.trim(); if (!body || sending) return
    haptic('light')
    setSending(true)
    try {
      const c = await addComment(activityId, body)
      if (c) {
        setFresh(c.id)
        setComments(prev => { const next = [...(prev ?? []), c]; onCount(next.length); return next })
        setText('')
      }
    } catch { /* ignore */ } finally { setSending(false) }
  }
  async function remove(id: string) {
    if (confirmDel !== id) { haptic('medium'); setConfirmDel(id); return }
    setConfirmDel(null)
    await deleteComment(id).catch(() => {})
    setComments(prev => { const next = (prev ?? []).filter(c => c.id !== id); onCount(next.length); return next })
  }

  return (
    <CmSheet full onClose={onClose} title={t('w3f.comments')} sub={comments ? String(comments.length) : undefined} surface="card" zIndex={15200}
      footer={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: kb ? kb - 8 : 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder={t('w3f.add_comment')} maxLength={2000} className="cm-input" style={{ flex: 1, borderRadius: 'var(--r-pill)', padding: '12px 16px' }} />
          <button type="button" onClick={() => void send()} disabled={!text.trim() || sending} aria-label={t('w3f.send')} className="cm-btn cm-press"
            style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: text.trim() ? 'var(--primary)' : 'var(--surface-chip)', color: text.trim() ? 'var(--on-primary)' : 'var(--text-dim)',
              transform: text.trim() ? 'scale(1)' : 'scale(0.92)', transition: 'transform .22s cubic-bezier(.3,1.5,.5,1)' }}>
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      }>
      {comments === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 10 }}><CmSkel h={36} w={36} r="50%" /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}><CmSkel h={12} w="30%" /><CmSkel h={14} w="80%" /></div></div>)}
        </div>
      ) : comments.length === 0 ? (
        <CmEmpty icon={<MessageCircle size={26} strokeWidth={2} />} title={t('w3f.be_first_comment')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 0 4px', fontFamily: FB }}>
          {comments.map((c, i) => (
            <div key={c.id} className={fresh === c.id ? 'cm-rise' : 'cm-in'} style={{ ...(fresh === c.id ? null : stagger(i, 0, 26)), display: 'flex', gap: 10 }}>
              <CmAvatar name={c.name} url={c.avatar} seed={c.userId} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{relTime(c.createdAt, t)}</span>
                  {c.mine && (
                    <button type="button" onClick={() => void remove(c.id)} aria-label={t('w3f.delete')} className="cm-btn cm-press"
                      style={{ marginLeft: 'auto', height: 28, padding: confirmDel === c.id ? '0 10px' : '0 6px', borderRadius: 'var(--r-pill)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700,
                        color: confirmDel === c.id ? 'var(--danger)' : 'var(--text-dim)', background: confirmDel === c.id ? 'var(--danger-soft)' : 'transparent' }}>
                      <Trash2 size={14} strokeWidth={2.1} />{confirmDel === c.id && t('w3f.delete')}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 15.5, color: 'var(--text)', margin: '2px 0 0', lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div ref={listEnd} />
    </CmSheet>
  )
}
