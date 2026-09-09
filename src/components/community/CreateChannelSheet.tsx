'use client'
// ══════════════════════════════════════════════════════════════════════════
// Création d'un salon. Type Texte / Vocal (c'est tout) + option « salon privé ».
// Mobile : sur-page coulissante (bas→haut, sort haut→bas). Desktop : modale
// centrée. createPortal sur document.body.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import type { ChannelKind } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function CreateChannelSheet({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (name: string, kind: ChannelKind, isPrivate: boolean) => void | Promise<void>
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ChannelKind>('text')
  const [priv, setPriv] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    const n = name.trim()
    if (!n || busy) return
    setBusy(true)
    await onCreate(n, kind, priv)
    requestClose()
  }

  if (!mounted || typeof document === 'undefined') return null

  const body = (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-3)' }}>
        {isNarrow
          ? <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
          : null}
      </div>
      <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>{t('w1g.ch.title')}</h2>

      {/* Type de salon : Texte / Vocal */}
      <label style={labelStyle}>{t('w1g.ch.type')}</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <TypeBtn active={kind === 'text'} onClick={() => setKind('text')}
          icon={<span style={{ fontSize: 18, lineHeight: 1 }}>#</span>}
          title={t('w1g.ch.text')} sub={t('w1g.ch.textSub')} />
        <TypeBtn active={kind === 'voice'} onClick={() => setKind('voice')}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>}
          title={t('w1g.ch.voice')} sub={t('w1g.ch.voiceSub')} />
      </div>

      {/* Nom du salon */}
      <label style={labelStyle}>{t('w1g.ch.name')}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 15, flexShrink: 0 }}>{kind === 'voice' ? '🔊' : '#'}</span>
        <input autoFocus value={name} onChange={e => setName(e.target.value.slice(0, 60))}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }}
          placeholder={t('w1g.channelNamePlaceholder')}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 'var(--space-3) 0', fontFamily: FB, fontSize: 14, color: 'var(--text)', outline: 'none' }} />
      </div>

      {/* Salon privé */}
      <button type="button" onClick={() => setPriv(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)', padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', marginBottom: 'var(--space-5)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{t('w1g.ch.private')}</span>
          <span style={{ display: 'block', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{t('w1g.ch.privateSub')}</span>
        </span>
        <span aria-hidden style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, background: priv ? 'var(--primary)' : 'var(--surface-neutral)', position: 'relative', transition: 'background 0.18s ease' }}>
          <span style={{ position: 'absolute', top: 2, left: priv ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-card)', transition: 'left 0.18s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
        </span>
      </button>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button onClick={requestClose} style={{ flex: '0 0 auto', height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.cancel')}</button>
        <button onClick={() => void submit()} disabled={!name.trim() || busy}
          style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: name.trim() && !busy ? 'pointer' : 'default', opacity: name.trim() && !busy ? 1 : 0.6 }}>
          {busy ? t('w1g.creating') : t('w1g.ch.create')}
        </button>
      </div>
    </>
  )

  // Mobile → sur-page coulissante (bas). Desktop → modale centrée.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15000, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div role="dialog" aria-modal="true" style={isNarrow ? {
        position: 'relative', width: '100%', maxWidth: 560,
        maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: 'var(--space-3) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
      } : {
        position: 'relative', width: '100%', maxWidth: 440,
        maxHeight: 'calc(100dvh - 80px)', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'scale(1)' : 'scale(0.96)',
        opacity: shown && !closing ? 1 : 0,
        transition: 'transform 0.22s ease, opacity 0.22s ease',
        padding: 'var(--space-6)',
      }}>
        {body}
      </div>
    </div>,
    document.body,
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)',
}

function TypeBtn({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', padding: 'var(--space-3) var(--space-4)', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)' }}>
      <span style={{ color: active ? 'var(--primary)' : 'var(--text-mid)', display: 'flex', alignItems: 'center', height: 20 }}>{icon}</span>
      <span style={{ fontFamily: FB, fontSize: 13.5, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text)' }}>{title}</span>
      <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.35 }}>{sub}</span>
    </button>
  )
}
