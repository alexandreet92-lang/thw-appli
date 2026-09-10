'use client'
// Petit « ? » discret + modale centrée (createPortal) expliquant SM / SN / CTL / ATL / TSB.
// Fermable au tap dehors ou via la croix. Fraunces titres, Inter corps, var() only.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <p style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{title}</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>{body}</p>
    </div>
  )
}

export function InfoSmSn({ size = 16 }: { size?: number }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (!open) return
    setClosing(false)
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [open])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(() => setOpen(false), 240) }
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOpen(true) }} aria-label={t('shared.aboutSmSn')}
        style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: FB, fontSize: size * 0.68, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
        ?
      </button>
      {open && createPortal(
        <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', padding: 'var(--space-6)', boxSizing: 'border-box', transform: shown && !closing ? 'scale(1)' : 'scale(0.96)', opacity: shown && !closing ? 1 : 0, transition: 'transform 0.24s cubic-bezier(0.32,0.72,0,1), opacity 0.24s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{t('shared.trainingLoad')}</span>
              <button onClick={requestClose} aria-label={t('shared.close')} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <Block title={t('shared.smTitle')} body={t('shared.smBody')} />
            <Block title={t('shared.snTitle')} body={t('shared.snBody')} />
            <Block title={t('shared.ctlTitle')} body={t('shared.ctlBody')} />
            <Block title={t('shared.atlTitle')} body={t('shared.atlBody')} />
            <Block title="TSB" body={t('shared.tsbBody')} />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
