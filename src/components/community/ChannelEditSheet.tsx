'use client'
// ══════════════════════════════════════════════════════════════════════════
// « Modifier le salon » : nom, sujet, thèmes (nutrition / entraînement /
// récupération + thèmes personnalisés), et paramètres de notification.
// Sur-page coulissante mobile / modale desktop. Tokens uniquement ; bordure
// seulement sur les inputs (Design System).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { updateChannel, toggleChannelMute } from '@/lib/community/channels'
import type { CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function ChannelEditSheet({ channel, isMuted, onClose, onSaved }: {
  channel: CommunityChannel
  isMuted: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [name, setName] = useState(channel.name)
  const [topic, setTopic] = useState(channel.topic ?? '')
  const [themes, setThemes] = useState<string[]>(channel.themes)
  const [customTheme, setCustomTheme] = useState('')
  const [muted, setMuted] = useState(isMuted)
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

  // Thèmes suggérés + ceux déjà posés (dédupliqués).
  const suggestions = useMemo(() => {
    const base = [t('w1g.ch.themeNutrition'), t('w1g.ch.themeTraining'), t('w1g.ch.themeRecovery')]
    const set = new Set(base.map(s => s.toLowerCase()))
    return base.concat(themes.filter(x => !set.has(x.toLowerCase())))
  }, [themes, t])

  function toggleTheme(label: string) {
    const key = label.toLowerCase()
    setThemes(prev => prev.some(x => x.toLowerCase() === key) ? prev.filter(x => x.toLowerCase() !== key) : [...prev, label])
  }
  function addCustom() {
    const v = customTheme.trim().slice(0, 30)
    if (!v) return
    if (!themes.some(x => x.toLowerCase() === v.toLowerCase())) setThemes(prev => [...prev, v])
    setCustomTheme('')
  }

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    await updateChannel(channel.id, { name, topic, themes })
    if (muted !== isMuted) await toggleChannelMute(channel.id, isMuted) // isMuted = état actuel
    onSaved()
    requestClose()
  }

  if (!mounted || typeof document === 'undefined') return null
  const active = (label: string) => themes.some(x => x.toLowerCase() === label.toLowerCase())

  const body = (
    <>
      {isNarrow && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-3)' }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>
      )}
      <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>{t('w1g.ch.editTitle')}</h2>

      <label style={labelStyle}>{t('w1g.ch.name')}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 15, flexShrink: 0 }}>{channel.kind === 'voice' ? '🔊' : '#'}</span>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 60))}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 'var(--space-3) 0', fontFamily: FB, fontSize: 14, color: 'var(--text)', outline: 'none' }} />
      </div>

      <label style={labelStyle}>{t('w1g.ch.topic')}</label>
      <textarea value={topic} onChange={e => setTopic(e.target.value.slice(0, 200))} rows={3} placeholder={t('w1g.ch.topicPh')}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 64, marginBottom: 'var(--space-4)' }} />

      <label style={labelStyle}>{t('w1g.ch.themes')}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {suggestions.map(s => (
          <button key={s} type="button" onClick={() => toggleTheme(s)}
            style={{ height: 32, padding: '0 var(--space-3)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600, background: active(s) ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: active(s) ? 'var(--primary)' : 'var(--text-mid)' }}>
            {active(s) ? '✓ ' : ''}{s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <input value={customTheme} onChange={e => setCustomTheme(e.target.value.slice(0, 30))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder={t('w1g.ch.themeCustomPh')} style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addCustom} disabled={!customTheme.trim()}
          style={{ flexShrink: 0, height: 'auto', padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: customTheme.trim() ? 'pointer' : 'default', opacity: customTheme.trim() ? 1 : 0.5 }}>{t('w1g.ch.themeAdd')}</button>
      </div>

      <label style={labelStyle}>{t('w1g.ch.notifs')}</label>
      <button type="button" onClick={() => setMuted(m => !m)}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)', padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', marginBottom: 'var(--space-5)' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{muted ? t('w1g.ch.notifMuted') : t('w1g.ch.notifAll')}</span>
          <span style={{ display: 'block', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{muted ? t('w1g.ch.notifMutedSub') : t('w1g.ch.notifAllSub')}</span>
        </span>
        <span aria-hidden style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, background: !muted ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 0.18s ease' }}>
          <span style={{ position: 'absolute', top: 2, left: !muted ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-card)', transition: 'left 0.18s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
        </span>
      </button>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button onClick={requestClose} style={{ flex: '0 0 auto', height: 44, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.cancel')}</button>
        <button onClick={() => void save()} disabled={!name.trim() || busy}
          style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: name.trim() && !busy ? 'pointer' : 'default', opacity: name.trim() && !busy ? 1 : 0.6 }}>
          {busy ? t('w1g.creating') : t('w1g.ch.save')}
        </button>
      </div>
    </>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15300, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div role="dialog" aria-modal="true" style={isNarrow ? {
        position: 'relative', width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: 'var(--space-3) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
      } : {
        position: 'relative', width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 80px)', overflowY: 'auto',
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

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none',
}
