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
import { getMessages, sendMessage, markThreadRead, editMessage, deleteMessage, uploadMessageAttachment, type Msg } from '@/lib/coach/messages'
import { ReportBlockActions } from '@/components/moderation/ReportBlockActions'
import { useI18n } from '@/lib/i18n'

const fmtTime = (d: string) => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

const menuItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', cursor: 'pointer', textAlign: 'left' }

// Coche(s) de statut d'un message m'appartenant : ⏳ en cours · ✓ envoyé · ✓✓ vu.
function StatusTick({ m }: { m: Msg }) {
  const { t } = useI18n()
  const sending = m.id.startsWith('tmp-')
  const seen = !!m.read_at
  const label = sending ? t('w2d.statusSending') : seen ? t('w2d.statusSeen') : t('w2d.statusSent')
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

// Rendu d'une pièce jointe dans une bulle : image (vignette cliquable),
// parcours (GPX/TCX) ou fichier (PDF…) sous forme de puce téléchargeable.
function MsgMedia({ url, type, name, mine }: { url: string; type: 'image' | 'parcours' | 'file' | null; name: string | null; mine: boolean }) {
  const { t } = useI18n()
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'block' }}>
        <img src={url} alt={name ?? t('w2d.imageAlt')} style={{ maxWidth: '100%', width: 220, maxHeight: 260, objectFit: 'cover', borderRadius: 11, display: 'block' }} />
      </a>
    )
  }
  const fg = mine ? 'var(--on-primary)' : 'var(--text)'
  const iconSvg = type === 'parcours'
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name ?? undefined} onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 10, textDecoration: 'none',
        background: mine ? 'color-mix(in srgb, #000 12%, transparent)' : 'var(--bg-card2)', color: fg, maxWidth: 240 }}>
      <span style={{ flexShrink: 0, display: 'flex' }}>{iconSvg}</span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name ?? (type === 'parcours' ? t('w2d.parcours') : t('w2d.file'))}</span>
        <span style={{ fontSize: 10.5, opacity: 0.7 }}>{type === 'parcours' ? t('w2d.parcoursOpen') : t('w2d.open')}</span>
      </span>
    </a>
  )
}

export function MessageThread({ coachId, athleteId, compact = false }: { coachId: string; athleteId: string; compact?: boolean }) {
  const { t } = useI18n()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuId, setMenuId] = useState<string | null>(null)      // message dont le menu d'actions est ouvert
  const [editId, setEditId] = useState<string | null>(null)      // message en cours d'édition
  const [editText, setEditText] = useState('')
  const [attach, setAttach] = useState<File | null>(null)   // pièce jointe en attente d'envoi
  const [attachErr, setAttachErr] = useState<string | null>(null)
  const [plusOpen, setPlusOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  // Aperçu image local (object URL) pour la pièce jointe en attente.
  const attachPreview = attach && attach.type.startsWith('image/') ? URL.createObjectURL(attach) : null
  useEffect(() => () => { if (attachPreview) URL.revokeObjectURL(attachPreview) }, [attachPreview])

  function pickAttach(f: File | null) {
    setPlusOpen(false); setAttachErr(null)
    if (!f) return
    if (f.size > 25 * 1024 * 1024) { setAttachErr(t('w2d.fileTooLarge')); return }
    setAttach(f)
  }

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
    const file = attach
    if ((!body && !file) || sending) return
    setSending(true); setInput(''); setAttach(null); setAttachErr(null)
    // Optimiste : on affiche tout de suite (statut « en cours d'envoi »).
    const optimistic: Msg = { id: `tmp-${Date.now()}`, coach_id: coachId, athlete_id: athleteId, sender_id: 'me', body, created_at: new Date().toISOString(), read_at: null, edited_at: null, deleted_at: null, media_url: attachPreview, media_type: file ? (file.type.startsWith('image/') ? 'image' : /\.(gpx|tcx)$/i.test(file.name) ? 'parcours' : 'file') : null, media_name: file?.name ?? null, mine: true }
    setMsgs(m => [...m, optimistic])
    try {
      // Pièce jointe + légende = UN SEUL message : on upload d'abord, puis on
      // envoie le message avec l'attachement et le texte ensemble.
      const uploaded = file ? await uploadMessageAttachment(file) : null
      await sendMessage(coachId, athleteId, body, uploaded)
      await refresh()
    } catch (e) {
      setInput(body); if (file) setAttach(file)
      setMsgs(m => m.filter(x => x.id !== optimistic.id))
      setAttachErr(e instanceof Error ? e.message : t('w2d.sendFailed'))
    } finally { setSending(false) }
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
    if (typeof window !== 'undefined' && !window.confirm(t('w2d.confirmDeleteMessage'))) return
    setMsgs(list => list.map(x => x.id === m.id ? { ...x, body: '', deleted_at: new Date().toISOString() } : x))
    try { await deleteMessage(m.id); await refresh() } catch { void refresh() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: 8 }}
        onClick={() => menuId && setMenuId(null)}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto' }}>{t('w2d.loading')}</p>
        ) : msgs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 'auto', textAlign: 'center' }}>{t('w2d.noMessages')}</p>
        ) : msgs.map(m => {
          const deleted = !!m.deleted_at
          const editing = editId === m.id
          const canAct = m.mine && !deleted && !m.id.startsWith('tmp-')
          const canReport = !m.mine && !deleted && !m.id.startsWith('tmp-')
          const hasMenu = canAct || canReport
          return (
            <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%', position: 'relative' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() } if (e.key === 'Escape') setEditId(null) }}
                    style={{ minWidth: 200, resize: 'none', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--primary)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.4 }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer' }}>{t('w2d.cancel')}</button>
                    <button onClick={() => void saveEdit()} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', fontWeight: 600 }}>{t('w2d.save')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={e => { if (hasMenu) { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id) } }}
                    style={{ padding: m.media_type === 'image' && !m.body && !deleted ? 4 : '8px 12px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45, fontFamily: 'var(--font-body)',
                      cursor: hasMenu ? 'pointer' : 'default',
                      background: deleted ? 'transparent' : m.mine ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 12%, var(--bg-card))',
                      color: deleted ? 'var(--text-dim)' : m.mine ? 'var(--on-primary)' : 'var(--text)',
                      border: deleted ? '1px dashed var(--border)' : m.mine ? 'none' : '1px solid color-mix(in srgb, var(--primary) 18%, transparent)',
                      fontStyle: deleted ? 'italic' : 'normal',
                      borderBottomRightRadius: m.mine ? 4 : 14, borderBottomLeftRadius: m.mine ? 14 : 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {deleted ? t('w2d.messageDeleted') : (<>
                      {m.media_url && <MsgMedia url={m.media_url} type={m.media_type} name={m.media_name} mine={m.mine} />}
                      {m.body && <span style={{ display: 'block', ...(m.media_url ? { marginTop: 6 } : {}) }}>{m.body}</span>}
                    </>)}
                  </div>
                  {/* Menu d'actions : mes messages → Modifier/Supprimer ; ceux de l'autre → Signaler/Bloquer */}
                  {menuId === m.id && hasMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: m.mine ? 0 : 'auto', left: m.mine ? 'auto' : 0, marginTop: 4, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', overflow: 'hidden', minWidth: 140 }}>
                      {canAct ? (<>
                        <button onClick={e => { e.stopPropagation(); startEdit(m) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                          {t('w2d.edit')}
                        </button>
                        <button onClick={e => { e.stopPropagation(); void remove(m) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                          {t('w2d.delete')}
                        </button>
                      </>) : (
                        <ReportBlockActions
                          targetUserId={m.sender_id}
                          context="coach_dm"
                          messageId={m.id}
                          messageExcerpt={m.body || (m.media_name ?? null)}
                          itemStyle={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
                          onClose={() => setMenuId(null)}
                          onBlocked={() => { setMenuId(null); void refresh() }}
                        />
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textAlign: m.mine ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: 2, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                    <span>{fmtTime(m.created_at)}</span>
                    {m.edited_at && !deleted && <span style={{ fontStyle: 'italic' }}>{t('w2d.editedSuffix')}</span>}
                    {m.mine && !deleted && <StatusTick m={m} />}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: 10 }}>
        {/* Inputs cachés : fichier (image/parcours/PDF) + caméra (mobile) */}
        <input ref={fileRef} type="file" accept="image/*,.gpx,.tcx,application/gpx+xml,application/pdf" style={{ display: 'none' }}
          onChange={e => pickAttach(e.target.files?.[0] ?? null)} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => pickAttach(e.target.files?.[0] ?? null)} />

        {attachErr && <p style={{ fontSize: 11.5, color: '#EF4444', margin: '0 0 8px', fontWeight: 600 }}>{attachErr}</p>}

        {/* Aperçu de la pièce jointe en attente (envoyée AVEC la légende) */}
        {attach && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: 8, borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
            {attachPreview
              ? <img src={attachPreview} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              : <span style={{ flexShrink: 0, display: 'flex', color: 'var(--text-mid)' }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>}
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attach.name}</span>
            <button onClick={() => setAttach(null)} aria-label={t('w2d.remove')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* Bouton + : joindre un fichier ou prendre une photo */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setPlusOpen(o => !o)} aria-label={t('w2d.attach')} title={t('w2d.attachTitle')}
              style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border)', background: plusOpen ? 'var(--primary-dim)' : 'var(--bg-card)', color: plusOpen ? 'var(--primary)' : 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            {plusOpen && (<>
              <div onClick={() => setPlusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
              <div style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 31, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.22)', overflow: 'hidden', minWidth: 210 }}>
                <button onClick={() => { setPlusOpen(false); fileRef.current?.click() }} style={menuItem}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"/></svg> {t('w2d.attachPhotoFileParcours')}
                </button>
                <button onClick={() => { setPlusOpen(false); camRef.current?.click() }} style={{ ...menuItem, borderTop: '1px solid var(--border)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> {t('w2d.takePhoto')}
                </button>
              </div>
            </>)}
          </div>

          <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            placeholder={attach ? t('w2d.captionPlaceholder') : t('w2d.messagePlaceholder')}
            style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '11px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.45, transition: 'border-color .15s, box-shadow .15s', boxShadow: 'var(--shadow-card)' }} />
          <button onClick={() => void send()} disabled={(!input.trim() && !attach) || sending} aria-label={t('w2d.send')}
            style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: (input.trim() || attach) ? 'var(--primary)' : 'var(--border)', color: (input.trim() || attach) ? 'var(--on-primary)' : 'var(--text-dim)', cursor: (input.trim() || attach) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
