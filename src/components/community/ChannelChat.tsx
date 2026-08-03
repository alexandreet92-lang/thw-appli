'use client'
// ══════════════════════════════════════════════════════════════════════════
// Fil d'un canal : messages + composer + append en direct (Supabase Realtime).
// Densité lisible « type Whoop », feed façon Discord (avatar + nom + heure,
// messages consécutifs groupés). Aucune bordure hors input ; tokens uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getChannelMessages, sendChannelMessage, uploadCommunityMedia } from '@/lib/community/messages'
import { markChannelRead } from '@/lib/community/channels'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import type { CommunityChannel, CommunityMessage, CommunityAttachment } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
function fmtDay(iso: string): string {
  try {
    const d = new Date(iso)
    const today = new Date()
    const y = new Date(today); y.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
    if (d.toDateString() === y.toDateString()) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return '' }
}

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-neutral)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontFamily: FB, fontWeight: 600, fontSize: size * 0.4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function ChannelChat({
  channel, isMember, canPost, canUpload, onJoin, joining,
}: {
  channel: CommunityChannel
  isMember: boolean
  canPost: boolean
  canUpload: boolean
  onJoin: () => void
  joining: boolean
}) {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<CommunityAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  // Dictée vocale : on gèle le texte déjà saisi puis on lui ajoute la transcription.
  const voiceBase = useRef('')
  const { supported: micSupported, isListening, toggle: toggleMic } = useSpeechToText(
    (text) => setInput((voiceBase.current ? voiceBase.current.trimEnd() + ' ' : '') + text),
  )
  // Nom de canal Realtime UNIQUE par instance : la page est montée dans les deux
  // shells (desktop + mobile) simultanément, donc ChannelChat existe en double.
  // Sans suffixe unique, les deux instances ouvriraient le même canal Realtime
  // sur le client Supabase singleton → « cannot add postgres_changes callbacks
  // after subscribe() ». useId() donne un identifiant stable et distinct par instance.
  const instanceId = useId()

  const load = useCallback(async () => {
    if (!isMember) { setMessages([]); setLoading(false); return }
    const msgs = await getChannelMessages(channel.id)
    setMessages(msgs)
    setLoading(false)
    void markChannelRead(channel.id)
  }, [channel.id, isMember])

  useEffect(() => { setLoading(true); void load() }, [load])

  // Append en direct : à chaque INSERT sur ce canal, on re-fetch (le payload brut
  // n'a pas la jointure profil de l'auteur).
  useEffect(() => {
    if (!isMember) return
    const sb = createClient()
    const ch = sb.channel(`comm-ch-${channel.id}-${instanceId}`).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channel.id}` },
      () => void load(),
    ).subscribe()
    return () => { void sb.removeChannel(ch) }
  }, [channel.id, isMember, load, instanceId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const body = input.trim()
    if ((!body && pending.length === 0) || sending || uploading) return
    setSending(true)
    const sentAttachments = pending
    setInput(''); setPending([])
    const ok = await sendChannelMessage(channel.id, body, sentAttachments)
    setSending(false)
    if (ok) void load()
    else { setInput(body); setPending(sentAttachments); setNotice('Envoi impossible.') } // rollback
  }

  function openFilePicker() {
    if (!canUpload) { setNotice('Passe Premium pour envoyer des photos et fichiers.'); return }
    fileRef.current?.click()
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setNotice(null); setUploading(true)
    for (const f of files.slice(0, 6)) {
      const att = await uploadCommunityMedia(f)
      if (att) setPending(p => [...p, att])
      else setNotice('Une pièce jointe n\'a pas pu être envoyée.')
    }
    setUploading(false)
  }

  // En-tête éditorial du canal.
  const canSend = (input.trim().length > 0 || pending.length > 0) && !sending && !uploading && canPost

  const header = (
    <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>#{channel.name}</span>
      </div>
      {channel.topic && (
        <p style={{ margin: 'var(--space-1) 0 0', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.4 }}>{channel.topic}</p>
      )}
    </div>
  )

  // Pas encore membre : invitation à rejoindre (lecture du fil = membre).
  if (!isMember) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
        {header}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>Rejoins l&apos;espace pour lire et participer</span>
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 360, lineHeight: 1.5 }}>
            La discussion s&apos;ouvre dès que tu fais partie de l&apos;espace. C&apos;est gratuit et instantané.
          </p>
          <button onClick={onJoin} disabled={joining}
            style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.6 : 1 }}>
            {joining ? 'Connexion…' : 'Rejoindre'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      {header}

      {/* Fil */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-2) var(--space-5) var(--space-4)' }}>
        {loading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 ? (
          <div style={{ padding: 'var(--space-10) var(--space-4)', textAlign: 'center' }}>
            <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>#{channel.name} démarre ici</p>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Sois le premier à écrire — lance la conversation.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const grouped = !newDay && prev.authorId === m.authorId &&
              (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60_000
            return (
              <div key={m.id}>
                {newDay && (
                  <div style={{ textAlign: 'center', margin: 'var(--space-4) 0 var(--space-3)', fontFamily: FB, fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{fmtDay(m.createdAt)}</div>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-3)', padding: grouped ? '1px 0' : 'var(--space-2) 0 1px', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, flexShrink: 0 }}>
                    {!grouped && <Avatar name={m.authorName} url={m.authorAvatar} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!grouped && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 2 }}>
                        <span style={{ fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{m.authorName}</span>
                        <span className="tnum" style={{ fontFamily: FB, fontSize: 10.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(m.createdAt)}</span>
                        {m.editedAt && <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>(modifié)</span>}
                      </div>
                    )}
                    {m.body && <p style={{ margin: 0, fontFamily: FB, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</p>}
                    {m.attachments.length > 0 && <Attachments items={m.attachments} />}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-5) var(--space-4)', background: 'var(--bg-card)' }}>
        {notice && (
          <p style={{ margin: '0 0 var(--space-2)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{notice}</p>
        )}
        {(pending.length > 0 || uploading) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            {pending.map((a, i) => (
              <PendingChip key={a.url} att={a} onRemove={() => setPending(p => p.filter((_, j) => j !== i))} />
            ))}
            {uploading && <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center' }}>Envoi…</span>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)', background: 'var(--input-bg)', borderRadius: 'var(--r-md)', padding: 'var(--space-2) var(--space-2) var(--space-2) var(--space-2)' }}>
          <button type="button" onClick={openFilePicker} disabled={!canPost}
            aria-label="Ajouter une photo ou un fichier" title="Photo, fichier…"
            style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: canPost ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 4000))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder={`Écrire dans #${channel.name}…`}
            rows={1}
            disabled={!canPost}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 13.5, lineHeight: 1.5, maxHeight: 120, padding: 'var(--space-2) 0' }}
          />
          {micSupported && (
            <button
              type="button"
              onClick={() => { if (!isListening) voiceBase.current = input; toggleMic() }}
              disabled={!canPost}
              aria-label={isListening ? 'Arrêter la dictée' : 'Dicter'}
              title={isListening ? 'Arrêter la dictée' : 'Dicter'}
              className={isListening ? 'mic-listening' : undefined}
              style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: isListening ? 'var(--charge-hard)' : 'var(--text-mid)', cursor: canPost ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>
            </button>
          )}
          <button onClick={() => void send()} disabled={(!input.trim() && pending.length === 0) || sending || uploading || !canPost} aria-label="Envoyer"
            style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: canSend ? 'var(--primary)' : 'var(--surface-neutral)', color: canSend ? 'var(--on-primary)' : 'var(--text-dim)', cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Pièces jointes d'un message : images en vignette, fichiers en pastille.
function Attachments({ items }: { items: CommunityAttachment[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      {items.map(a => a.type === 'image' ? (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} style={{ maxWidth: 320, maxHeight: 320, width: 'auto', height: 'auto', borderRadius: 'var(--r-md)', objectFit: 'cover', background: 'var(--surface-neutral)' }} />
        </a>
      ) : (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', maxWidth: 280, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text)', textDecoration: 'none', fontFamily: FB, fontSize: 12.5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-mid)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
        </a>
      ))}
    </div>
  )
}

// Vignette d'une pièce jointe en attente d'envoi (avec retrait).
function PendingChip({ att, onRemove }: { att: CommunityAttachment; onRemove: () => void }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', height: 44, padding: att.type === 'image' ? 0 : '0 var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', overflow: 'hidden' }}>
      {att.type === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={att.url} alt={att.name} style={{ width: 44, height: 44, objectFit: 'cover' }} />
      ) : (
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
      )}
      <button type="button" onClick={onRemove} aria-label="Retirer"
        style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1 }}>×</button>
    </span>
  )
}

function MessagesSkeleton() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4) 0' }}>
      {[68, 82, 55, 74].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-neutral)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', width: 120, height: 11, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', marginBottom: 8 }} />
            <span style={{ display: 'block', width: `${w}%`, height: 12, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
