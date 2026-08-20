'use client'

// Fil de discussion coach ↔ athlète (réutilisé : page coach, page athlète,
// bulle flottante). Charge le fil, marque comme lu, rafraîchit en douceur,
// et envoie. Lecture/écriture via la RLS coach_messages.
//
// Statuts d'un message envoyé (côté expéditeur) :
//   • en cours d'envoi  → optimiste, pas encore confirmé serveur
//   • envoyé            → confirmé, non lu par le destinataire
//   • vu               → read_at posé par le destinataire
// Actions sur ses propres messages : Modifier / Supprimer (soft-delete).

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMessages, sendMessage, markThreadRead, editMessage, deleteMessage, type Msg } from '@/lib/coach/messages'

const fmtTime = (d: string) => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

// Coche(s) de statut d'un message m'appartenant : ⏳ en cours · ✓ envoyé · ✓✓ vu.
function StatusTick({ m }: { m: Msg }) {
  const sending = m.id.startsWith('tmp-')
  const seen = !!m.read_at
  const label = sending ? 'En cours d’envoi' : seen ? 'Vu' : 'Envoyé'
  return (
    <span aria-label={label} title={label} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, color: seen ? 'var(--primary)' : 'var(--text-dim)' }}>
      {sending ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" opacity="0.4"/><path d="M12 7v5l3 2"/></svg>
      ) : seen ? (
        <svg width="15" height="11" viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l5 5 9-11"/><path d="M13 14l1 1 9-11"/></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l4 4 9-11"/></svg>
      )}
    </span>
  )
}

export function MessageThread({ coachId, athleteId, compact = false }: { coachId: string; athleteId: string; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuId, setMenuId] = useState<string | null>(null)      // message dont le menu d'actions est ouvert
  const [editId, setEditId] = useState<string | null>(null)      // message en cours d'édition
  const [editText, setEditText] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      const m = await getMessages(coachId, athleteId)
      setMsgs(m)
      void markThreadRead(coachId, athleteId)
    } catch { /* silencieux */ } finally { setLoading(false) }
  }, [coachId, athleteId])

  useEffect(() => { setLoading(true); void refresh() }, [refresh])
  // Rafraîchissement doux tant que le fil est ouvert (sauf pendant une édition).
  // On ne sonde QUE si l'onglet est visible — inutile de charger la base quand
  // l'app est en arrière-plan (allège une base sous pression).
  useEffect(() => {
    const iv = setInterval(() => {
      if (editId) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void refresh()
    }, 30000)
    return () => clearInterval(iv)
  }, [refresh, editId])
  // Autoscroll en bas à chaque nouveau lot.
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [msgs.length])

  const send = async () => {
    const body = input.trim()
    if (!body || sending) return
    setSending(true); setInput('')
    // Optimiste : on affiche tout de suite (statut « en cours d'envoi »).
    const optimistic: Msg = { id: `tmp-${Date.now()}`, coach_id: coachId, athlete_id: athleteId, sender_id: 'me', body, created_at: new Date().toISOString(), read_at: null, edited_at: null, deleted_at: null, mine: true }
    setMsgs(m => [...m, optimistic])
    try { await sendMessage(coachId, athleteId, body); await refresh() }
    catch { setInput(body); setMsgs(m => m.filter(x => x.id !== optimistic.id)) }
    finally { setSending(false) }
  }

  const startEdit = (m: Msg) => { setMenuId(null); setEditId(m.id); setEditText(m.body) }
  const saveEdit = async () => {
    const id = editId; const body = editText.trim()
    if (!id || !body) { setEditId(null); return }
    setMsgs(m => m.map(x => x.id === id ? { ...x, body, edited_at: new Date().toISOString() } : x))
    setEditId(null)
    try { await editMessage(id, body); await refresh() } catch { void refresh() }
  }
  const remove = async (m: Msg) => {
    setMenuId(null)
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce message ?')) return
    setMsgs(list => list.map(x => x.id === m.id ? { ...x, body: '', deleted_at: new Date().toISOString() } : x))
    try { await deleteMessage(m.id); await refresh() } catch { void refresh() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: 8 }}
        onClick={() => menuId && setMenuId(null)}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto' }}>Chargement…</p>
        ) : msgs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto', textAlign: 'center' }}>Aucun message. Écris le premier 👋</p>
        ) : msgs.map(m => {
          const deleted = !!m.deleted_at
          const editing = editId === m.id
          const canAct = m.mine && !deleted && !m.id.startsWith('tmp-')
          return (
            <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%', position: 'relative' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() } if (e.key === 'Escape') setEditId(null) }}
                    style={{ minWidth: 200, resize: 'none', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--primary)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.4 }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer' }}>Annuler</button>
                    <button onClick={() => void saveEdit()} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', fontWeight: 600 }}>Enregistrer</button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={e => { if (canAct) { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id) } }}
                    style={{ padding: '8px 12px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45, fontFamily: 'var(--font-body)',
                      cursor: canAct ? 'pointer' : 'default',
                      background: deleted ? 'transparent' : m.mine ? 'var(--primary)' : 'var(--bg-alt)',
                      color: deleted ? 'var(--text-dim)' : m.mine ? 'var(--on-primary)' : 'var(--text)',
                      border: deleted ? '1px dashed var(--border)' : 'none',
                      fontStyle: deleted ? 'italic' : 'normal',
                      borderBottomRightRadius: m.mine ? 4 : 14, borderBottomLeftRadius: m.mine ? 14 : 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {deleted ? 'Message supprimé' : m.body}
                  </div>
                  {/* Menu d'actions (mes messages) */}
                  {menuId === m.id && canAct && (
                    <div style={{ position: 'absolute', top: '100%', right: m.mine ? 0 : 'auto', left: m.mine ? 'auto' : 0, marginTop: 4, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', overflow: 'hidden', minWidth: 130 }}>
                      <button onClick={e => { e.stopPropagation(); startEdit(m) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                        Modifier
                      </button>
                      <button onClick={e => { e.stopPropagation(); void remove(m) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                        Supprimer
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textAlign: m.mine ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: 2, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                    <span>{fmtTime(m.created_at)}</span>
                    {m.edited_at && !deleted && <span style={{ fontStyle: 'italic' }}> · modifié</span>}
                    {m.mine && !deleted && <StatusTick m={m} />}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          placeholder="Écris un message…"
          style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '11px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.45, transition: 'border-color .15s, box-shadow .15s', boxShadow: 'var(--shadow-card)' }} />
        <button onClick={() => void send()} disabled={!input.trim() || sending} aria-label="Envoyer"
          style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: input.trim() ? 'var(--primary)' : 'var(--border)', color: input.trim() ? 'var(--on-primary)' : 'var(--text-dim)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  )
}
