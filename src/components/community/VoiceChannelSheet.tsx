'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sur-page VOCALE (façon Discord) — s'ouvre quand on tape un salon VOCAL.
// Slide-up bas→haut, sortie par la flèche haut-gauche OU en glissant vers le bas.
//   • bouton central bleu : Rejoindre le salon vocal
//   • à gauche : micro + caméra (intention de pré-jonction)
//   • à droite : « Message » (entre juste dans la discussion, sans le vocal)
//   • qui est déjà dans le vocal
//   • en haut à droite : Inviter des amis → sous-sheet coulissante
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { useCall } from './call/CallProvider'
import { MicIcon, MicOffIcon, CameraIcon, CameraOffIcon, VoiceIcon } from './call/callUi'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function VoiceChannelSheet({ channel, spaceName, isMember, onClose, onJoin, onOpenChat }: {
  channel: { id: string; name: string }
  spaceName?: string
  isMember: boolean
  onClose: () => void
  onJoin: (opts: { muted: boolean; cam: boolean }) => void
  onOpenChat: () => void
}) {
  const { t } = useI18n()
  const call = useCall()
  const [micWanted, setMicWanted] = useState(true)
  const [camWanted, setCamWanted] = useState(false)
  const [people, setPeople] = useState<string[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const startY = useRef<number | null>(null)

  // Qui est déjà dans le vocal (best-effort, rafraîchi).
  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const res = await fetch('/api/community/channel-participants', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId: channel.id }),
        })
        if (!res.ok) return
        const { participants } = (await res.json()) as { participants?: string[] }
        if (!stop) setPeople(participants ?? [])
      } catch { /* réseau */ }
    }
    void load()
    const iv = setInterval(load, 6000)
    return () => { stop = true; clearInterval(iv) }
  }, [channel.id])

  const join = () => { onJoin({ muted: !micWanted, cam: camWanted }); onClose() }

  const ctrl = (active: boolean, danger: boolean): React.CSSProperties => ({
    width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: danger ? 'var(--danger-soft)' : active ? 'var(--primary)' : 'var(--surface-neutral)',
    color: danger ? 'var(--danger)' : active ? 'var(--on-primary)' : 'var(--text)',
  })

  const node = (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'cardEnter 0.2s ease both' }} />
      <div
        onTouchStart={e => { startY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) onClose() }}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 3201, maxWidth: 560, margin: '0 auto',
          maxHeight: 'calc(100dvh - 72px)', overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none',
          padding: '10px 20px calc(22px + env(safe-area-inset-bottom, 0px))', animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both',
        }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '0 auto 12px' }} />

        {/* En-tête : flèche retour · titre · inviter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button onClick={onClose} aria-label={t('w2g.back')} style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <VoiceIcon />
              <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
            </div>
            {spaceName && <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{spaceName}</div>}
          </div>
          <button onClick={() => setInviteOpen(true)} aria-label={t('w2h.inviteFriends')} title={t('w2h.inviteFriends')}
            style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
          </button>
        </div>

        {/* Qui est déjà là */}
        <div style={{ margin: '14px 0 18px', minHeight: 44 }}>
          <div style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>{t('w2h.whoIsIn')}</div>
          {people.length === 0 ? (
            <div style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>{t('w2h.nobodyYet')}</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {people.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-dim, rgba(6,182,212,0.14))', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontFamily: FB, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{name.slice(0, 1).toUpperCase()}</span>
                  <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)' }}>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contrôles : micro/caméra · Rejoindre · Message */}
        {isMember ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setMicWanted(v => !v)} aria-label={micWanted ? t('w2g.muteMic') : t('w2g.unmuteMic')} style={ctrl(false, !micWanted)}>
                {micWanted ? <MicIcon /> : <MicOffIcon />}
              </button>
              <button onClick={() => setCamWanted(v => !v)} aria-label={camWanted ? t('w2g.stopCam') : t('w2g.startCam')} style={ctrl(camWanted, false)}>
                {camWanted ? <CameraIcon /> : <CameraOffIcon />}
              </button>
            </div>
            <button onClick={join} style={{ flex: 1, height: 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 14.5, fontWeight: 700 }}>
              {t('w2h.joinVoice')}
            </button>
            <button onClick={() => { onOpenChat(); onClose() }} aria-label={t('w2h.justMessage')} title={t('w2h.justMessage')} style={ctrl(false, false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </button>
          </div>
        ) : (
          <div style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: '10px 0' }}>{t('w2g.msgJoinNotMember')}</div>
        )}
      </div>

      {inviteOpen && <InviteSheet spaceName={spaceName} onClose={() => setInviteOpen(false)} />}
    </>
  )
  return createPortal(node, document.body)
}

// ── Sous-sheet « Inviter des amis » (même mécanique slide-up) ──────────────
function InviteSheet({ spaceName, onClose }: { spaceName?: string; onClose: () => void }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const startY = useRef<number | null>(null)
  const link = typeof window !== 'undefined' ? `${window.location.origin}/community` : ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard indispo */ }
  }
  const share = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> }
      if (nav.share) await nav.share({ title: spaceName || 'THW', text: t('w2h.inviteText', { space: spaceName || 'THW' }), url: link })
      else await copy()
    } catch { /* annulé */ }
  }

  const item = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB }}>
      <span style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', display: 'grid', placeItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{label}</span>
    </button>
  )

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'cardEnter 0.2s ease both' }} />
      <div
        onTouchStart={e => { startY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) onClose() }}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 3301, maxWidth: 560, margin: '0 auto', background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none', padding: '10px 20px calc(26px + env(safe-area-inset-bottom, 0px))', animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '0 auto 14px' }} />
        <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', textAlign: 'center' }}>{t('w2h.inviteFriends')}</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 6 }}>
          {item(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4M12 2v14" /></svg>, t('w2h.share'), () => void share())}
          {item(copied
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M20 6L9 17l-5-5" /></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>,
            copied ? t('w2h.linkCopied') : t('w2h.copyLink'), () => void copy())}
        </div>
      </div>
    </>,
    document.body,
  )
}
