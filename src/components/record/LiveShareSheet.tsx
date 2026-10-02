'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager ma position en direct » : choisir les proches (personnes
// suivies) qui suivront la sortie en temps réel, puis démarrer le partage.
// Flow record → couleurs directes (hors design-system enforced).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { listFollowing, type Person } from '@/lib/social/follows'
import { startLiveShare } from '@/lib/community/liveShare'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkGroup, RkRow, RkCta, RkIco, RK_ICON, useSheetClose } from './kit/RecordKit'


export default function LiveShareSheet({ sport, onStarted, onClose, isDark }: {
  sport: string | null
  onStarted: (shareId: string) => void
  onClose: () => void
  isDark: boolean
}) {
  const { t } = useI18n()
  const [open, close] = useSheetClose(onClose)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    void (async () => { try { setPeople(await listFollowing()) } catch { /* */ } finally { setLoading(false) } })()
  }, [])
  const toggle = (id: string) => { haptic('light'); setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const start = async () => {
    if (sel.size === 0 || starting) return
    setStarting(true)
    const id = await startLiveShare(sport, [...sel])
    setStarting(false)
    if (id) { haptic('success'); onStarted(id); close() }
  }

  return (
    <RkSheet open={open} onClose={close} title={t('record.liveShareTitle')} sub={t('record.liveShareSub')} isDark={isDark} zIndex={20009}
      footer={
        <RkCta variant="primary" onClick={() => { void start() }} disabled={sel.size === 0 || starting}>
          {starting ? t('record.liveShareStarting') : (sel.size > 0 ? t('record.liveShareStartN', { n: sel.size }) : t('record.liveShareStart'))}
        </RkCta>
      }>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', opacity: 0.7 }} />)}
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('record.liveShareLoading')}</span>
        </div>
      ) : people.length === 0 ? (
        <p style={{ fontSize: 15, color: 'var(--text-mid)', padding: '16px 4px', lineHeight: 1.5, textAlign: 'center' }}>{t('record.liveShareEmpty')}</p>
      ) : (
        <RkGroup>
          {people.map(p => {
            const on = sel.has(p.id)
            return (
              <RkRow key={p.id} onClick={() => toggle(p.id)} chevron={false}
                icon={
                  <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontWeight: 800 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.slice(0, 1).toUpperCase()}
                  </span>
                }
                label={p.name}
                right={
                  <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--primary)' : 'var(--surface-chip)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 200ms ease' }}>
                    {on && <RkIco d={RK_ICON.check} size={15} sw={3} />}
                  </span>
                } />
            )
          })}
        </RkGroup>
      )}
    </RkSheet>
  )
}
