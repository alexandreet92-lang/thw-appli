'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager ma position en direct » : choisir les proches (personnes
// suivies) qui suivront la sortie en temps réel, puis démarrer le partage.
// Flow record → couleurs directes (hors design-system enforced).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { listFollowing, type Person } from '@/lib/social/follows'
import { startLiveShare } from '@/lib/community/liveShare'

const ACCENT = '#06B6D4'

export default function LiveShareSheet({ sport, onStarted, onClose, isDark }: {
  sport: string | null
  onStarted: (shareId: string) => void
  onClose: () => void
  isDark: boolean
}) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    void (async () => { try { setPeople(await listFollowing()) } catch { /* */ } finally { setLoading(false) } })()
    return () => cancelAnimationFrame(r)
  }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const start = async () => {
    if (sel.size === 0 || starting) return
    setStarting(true)
    const id = await startLiveShare(sport, [...sel])
    setStarting(false)
    if (id) { onStarted(id); requestClose() }
  }

  const bg = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280'
  const track = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 20009, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '10px 18px calc(16px + env(safe-area-inset-bottom, 0px))', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10, flexShrink: 0 }}><span style={{ width: 40, height: 4, borderRadius: 2, background: track }} /></div>
        <div style={{ flexShrink: 0, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 21, fontWeight: 800, color: text, fontFamily: 'var(--font-display)' }}>{t('record.liveShareTitle')}</span>
            <button onClick={requestClose} aria-label={t('record.routeCreatorClose')} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: dim, margin: '4px 0 0' }}>{t('record.liveShareSub')}</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? <p style={{ fontSize: 13, color: dim, padding: '16px 4px' }}>{t('record.liveShareLoading')}</p>
            : people.length === 0 ? <p style={{ fontSize: 13, color: dim, padding: '16px 4px', lineHeight: 1.5 }}>{t('record.liveShareEmpty')}</p>
            : people.map(p => {
              const on = sel.has(p.id)
              return (
                <button key={p.id} onClick={() => toggle(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 6px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>
                  <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dim, fontWeight: 800 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? ACCENT : track}`, background: on ? ACCENT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </span>
                </button>
              )
            })}
        </div>

        <button onClick={start} disabled={sel.size === 0 || starting}
          style={{ flexShrink: 0, marginTop: 12, width: '100%', height: 52, borderRadius: 15, border: 'none', cursor: sel.size === 0 ? 'default' : 'pointer', background: sel.size === 0 ? surface : ACCENT, color: sel.size === 0 ? dim : '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'DM Sans, sans-serif' }}>
          {starting ? t('record.liveShareStarting') : (sel.size > 0 ? t('record.liveShareStartN', { n: sel.size }) : t('record.liveShareStart'))}
        </button>
      </div>
    </div>,
    document.body,
  )
}
