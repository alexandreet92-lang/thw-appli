'use client'

// Fil de discussion coach ↔ athlète (réutilisé : page coach, page athlète,
// bulle flottante). Charge le fil, marque comme lu, rafraîchit en douceur,
// et envoie. Lecture/écriture via la RLS coach_messages.

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMessages, sendMessage, markThreadRead, type Msg } from '@/lib/coach/messages'

const fmtTime = (d: string) => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

export function MessageThread({ coachId, athleteId, compact = false }: { coachId: string; athleteId: string; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      const m = await getMessages(coachId, athleteId)
      setMsgs(m)
      void markThreadRead(coachId, athleteId)
    } catch { /* silencieux */ } finally { setLoading(false) }
  }, [coachId, athleteId])

  useEffect(() => { setLoading(true); void refresh() }, [refresh])
  // Rafraîchissement doux tant que le fil est ouvert.
  useEffect(() => {
    const iv = setInterval(() => { void refresh() }, 12000)
    return () => clearInterval(iv)
  }, [refresh])
  // Autoscroll en bas à chaque nouveau lot.
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [msgs.length])

  const send = async () => {
    const body = input.trim()
    if (!body || sending) return
    setSending(true); setInput('')
    // Optimiste : on affiche tout de suite.
    const optimistic: Msg = { id: `tmp-${Date.now()}`, coach_id: coachId, athlete_id: athleteId, sender_id: 'me', body, created_at: new Date().toISOString(), read_at: null, mine: true }
    setMsgs(m => [...m, optimistic])
    try { await sendMessage(coachId, athleteId, body); await refresh() }
    catch { setInput(body); setMsgs(m => m.filter(x => x.id !== optimistic.id)) }
    finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto' }}>Chargement…</p>
        ) : msgs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto', textAlign: 'center' }}>Aucun message. Écris le premier 👋</p>
        ) : msgs.map(m => (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ padding: '8px 12px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45, fontFamily: 'DM Sans,sans-serif',
              background: m.mine ? 'var(--primary)' : 'var(--bg-alt)', color: m.mine ? 'var(--on-primary)' : 'var(--text)',
              borderBottomRightRadius: m.mine ? 4 : 14, borderBottomLeftRadius: m.mine ? 14 : 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {m.body}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textAlign: m.mine ? 'right' : 'left' }}>{fmtTime(m.created_at)}</div>
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          placeholder="Écris un message…"
          style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'DM Sans,sans-serif', outline: 'none', lineHeight: 1.4 }} />
        <button onClick={() => void send()} disabled={!input.trim() || sending} aria-label="Envoyer"
          style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: input.trim() ? 'var(--primary)' : 'var(--border)', color: input.trim() ? 'var(--on-primary)' : 'var(--text-dim)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  )
}
