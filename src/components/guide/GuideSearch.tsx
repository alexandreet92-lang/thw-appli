'use client'
// Palette de recherche du guide (type ⌘K). Suggestions + champ libre :
// matching flou LOCAL instantané, repli IA si aucune correspondance nette.
// Choisir un résultat lance le guide pas-à-pas.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { GUIDE_ACTIONS, searchActions, EXPRESS_TOUR, FULL_TOUR, type GuideStep } from './guideRegistry'
import { MobileSheet, SheetCard, SHEET_CARD_SHADOW, useMobileSafe } from '@/components/ui/BottomSheet'

export function GuideSearch({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (steps: GuideStep[]) => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mobile = useMobileSafe()
  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 60) } }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => (q.trim() ? searchActions(q) : GUIDE_ACTIONS), [q])
  const noMatch = q.trim().length > 0 && results.length === 0

  function askAi() {
    onClose()
    window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt: t('w3g.guide_search_ai_prompt', { q }) } }))
  }

  // Mobile (≤ 767 px) : feuille du bas — champ plein blanc, résultats en
  // liste groupée à filets, visites guidées en pilules.
  if (mobile) {
    const mRow = (key: string, label: string, sub: string, onClick: () => void, first: boolean, accent?: boolean) => (
      <button key={key} type="button" onClick={onClick}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
        {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{sub}</span>
        </span>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent ? 'var(--primary)' : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    )
    const pill: React.CSSProperties = { flex: 1, minHeight: 44, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--surface-card)', boxShadow: SHEET_CARD_SHADOW, color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }
    return (
      <MobileSheet open={open} onClose={onClose} full zIndex={99000} title={t('w3g.guide_tour')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-card)', boxShadow: SHEET_CARD_SHADOW }}>
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder={t('w3g.guide_search_placeholder')} enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, minHeight: 44, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-body)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onPick(EXPRESS_TOUR)} style={pill}>{t('w3g.guide_search_express')}</button>
            <button type="button" onClick={() => onPick(FULL_TOUR)} style={pill}>{t('w3g.guide_search_full')}</button>
          </div>
          {(results.length > 0 || noMatch) && (
            <SheetCard>
              {results.map((a, i) => mRow(a.id, a.label, a.category, () => onPick(a.steps), i === 0))}
              {noMatch && mRow('ai', t('w3g.guide_search_ask_ai', { q }), t('w3g.guide_search_ai_hint'), askAi, true, true)}
            </SheetCard>
          )}
        </div>
      </MobileSheet>
    )
  }

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99000, background: 'rgba(8,10,14,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px 16px', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* Champ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder={t('w3g.guide_search_placeholder')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px 6px' }}>{t('w3g.guide_search_esc')}</kbd>
        </div>

        {/* Résultats */}
        <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
          {results.map(a => (
            <button key={a.id} onClick={() => onPick(a.steps)} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)' }}>{a.category}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          ))}

          {noMatch && (
            <button onClick={askAi} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('w3g.guide_search_ask_ai', { q })}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)' }}>{t('w3g.guide_search_ai_hint')}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          )}
        </div>

        {/* Pied : relancer une visite guidée */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)', alignSelf: 'center', flex: 1 }}>{t('w3g.guide_tour')}</span>
          <button onClick={() => onPick(EXPRESS_TOUR)} style={tourBtn}>{t('w3g.guide_search_express')}</button>
          <button onClick={() => onPick(FULL_TOUR)} style={tourBtn}>{t('w3g.guide_search_full')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }
const tourBtn: React.CSSProperties = { padding: '7px 14px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
