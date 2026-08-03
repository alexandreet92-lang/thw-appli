'use client'
// ══════════════════════════════════════════════════════════════════════════
// Fil d'un canal : messages + composer + append en direct (Supabase Realtime).
// Densité lisible « type Whoop », feed façon Discord (avatar + nom + heure,
// messages consécutifs groupés). Aucune bordure hors input ; tokens uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getChannelMessages, sendChannelMessage } from '@/lib/community/messages'
import { markChannelRead } from '@/lib/community/channels'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import type { CommunityChannel, CommunityMessage } from '@/types/community'

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
  channel, isMember, canPost, onJoin, joining,
}: {
  channel: CommunityChannel
  isMember: boolean
  canPost: boolean
  onJoin: () => void
  joining: boolean
}) {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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
    if (!body || sending) return
    setSending(true)
    setInput('')
    const ok = await sendChannelMessage(channel.id, body)
    setSending(false)
    if (ok) void load()
    else setInput(body) // rollback en cas d'échec
  }

  // En-tête éditorial du canal.
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
                    <p style={{ margin: 0, fontFamily: FB, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</p>
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
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)', background: 'var(--input-bg)', borderRadius: 'var(--r-md)', padding: 'var(--space-2) var(--space-2) var(--space-2) var(--space-4)' }}>
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
          <button onClick={() => void send()} disabled={!input.trim() || sending || !canPost} aria-label="Envoyer"
            style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: input.trim() && !sending ? 'var(--primary)' : 'var(--surface-neutral)', color: input.trim() && !sending ? 'var(--on-primary)' : 'var(--text-dim)', cursor: input.trim() && !sending && canPost ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
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
