'use client'
// Header + Footer partagés des coquilles SessionEditor (mobile & desktop).
// Même look éditorial ; le footer peut être flottant (mobile) ou barre sticky (desktop).
import { useState } from 'react'
import { IconChevronLeft, IconFileText, IconStar, IconTrash, IconPrinter, IconCopy } from '@tabler/icons-react'
import { SPORT_LABEL, type SportType } from '@/app/planning/page'
import { PLAN_COLOR } from './editorial'
import type { SessionEditorPanelProps, DuplicateOpts } from './panelProps'
import { useI18n } from '@/lib/i18n'

// Suggestions rapides d'ajustement de durée (minutes) selon le sport.
function durChips(sport: SportType): number[] {
  if (sport === 'bike') return [15, 30, 60]
  return [5, 10, 15, 20]
}
const PCT_CHIPS = [5, 10, 15, 20]

// Popover « Dupliquer » : répète la séance toutes les 1 ou 2 semaines, N fois,
// avec ajustement de durée (min ou %) et choix du contenu copié.
function DuplicatePopover({ accent, sport, onApply, onClose }: { accent: string; sport: SportType; onApply: (n: number, c: number, opts: DuplicateOpts) => void; onClose: () => void }) {
  const [every, setEvery] = useState(1)
  const [count, setCount] = useState(4)
  const [adjMode, setAdjMode] = useState<'none' | 'min' | 'pct'>('none')
  const [dir, setDir] = useState<1 | -1>(1)
  const [mag, setMag] = useState(0)
  const [content, setContent] = useState<'full' | 'titleDuration'>('full')

  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 6px', borderRadius: 9, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, border: `1px solid ${on ? accent : 'var(--se-rule)'}`, background: on ? accent : 'var(--se-card)', color: on ? '#fff' : 'var(--se-dim)' })
  const chips = adjMode === 'min' ? durChips(sport) : PCT_CHIPS

  function apply() {
    const durationAdjust = adjMode !== 'none' && mag > 0 ? { mode: adjMode, delta: dir * mag } : null
    onApply(every, count, { durationAdjust, contentMode: content })
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', top: 38, right: 0, zIndex: 41, background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.22)', padding: 16, width: 288, maxHeight: '78vh', overflowY: 'auto' }}>
        <p style={{ margin: '0 0 4px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--se-text)' }}>Dupliquer la séance</p>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--se-dim)' }}>Répète cette séance dans le planning.</p>

        <Lbl>Fréquence</Lbl>
        <div style={{ display: 'flex', gap: 8, margin: '7px 0 14px' }}>
          {[{ n: 1, l: 'Chaque semaine' }, { n: 2, l: 'Toutes les 2 sem.' }].map(o => (
            <button key={o.n} type="button" onClick={() => setEvery(o.n)} style={seg(every === o.n)}>{o.l}</button>
          ))}
        </div>

        <Lbl>Nombre de semaines</Lbl>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '7px 0 14px' }}>
          <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))} style={stepBtn}>−</button>
          <span className="se-tnum" style={{ flex: 1, textAlign: 'center', fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--se-text)' }}>{count}</span>
          <button type="button" onClick={() => setCount(c => Math.min(52, c + 1))} style={stepBtn}>+</button>
        </div>

        <Lbl>Ajuster la durée</Lbl>
        <div style={{ display: 'flex', gap: 6, margin: '7px 0 8px' }}>
          {([['none', 'Inchangée'], ['min', 'Minutes'], ['pct', '%']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setAdjMode(k); setMag(0) }} style={seg(adjMode === k)}>{l}</button>
          ))}
        </div>
        {adjMode !== 'none' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setDir(1)} style={seg(dir === 1)}>Augmenter</button>
              <button type="button" onClick={() => setDir(-1)} style={seg(dir === -1)}>Baisser</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {chips.map(v => (
                <button key={v} type="button" onClick={() => setMag(m => m === v ? 0 : v)} style={{ padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: `1px solid ${mag === v ? accent : 'var(--se-rule)'}`, background: mag === v ? `${accent}1a` : 'var(--se-card)', color: mag === v ? accent : 'var(--se-dim)' }}>
                  {dir > 0 ? '+' : '−'}{v}{adjMode === 'min' ? '′' : '%'}
                </button>
              ))}
            </div>
          </>
        )}

        <Lbl>Contenu copié</Lbl>
        <div style={{ display: 'flex', gap: 6, margin: '7px 0 16px' }}>
          <button type="button" onClick={() => setContent('full')} style={seg(content === 'full')}>Contenu exact</button>
          <button type="button" onClick={() => setContent('titleDuration')} style={seg(content === 'titleDuration')}>Titre + durée</button>
        </div>

        <button type="button" onClick={apply}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Appliquer
        </button>
      </div>
    </>
  )
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--se-dim)' }}>{children}</span>
}
const stepBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }

export function PanelHeader({ p, titleSize = 21, padding = '14px 18px', bordered = true }: { p: SessionEditorPanelProps; titleSize?: number; padding?: string; bordered?: boolean }) {
  const { t } = useI18n()
  const [dupOpen, setDupOpen] = useState(false)
  const planCol = p.selPlan === 'A' ? PLAN_COLOR.A : PLAN_COLOR.B
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding, flexShrink: 0, background: 'var(--se-bg)', borderBottom: bordered ? '1px solid var(--se-rule)' : 'none' }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: p.sportAccent, flexShrink: 0 }}>{SPORT_LABEL[p.sport]}</span>
      <input value={p.title} onChange={e => p.setTitle(e.target.value)} placeholder={`${SPORT_LABEL[p.sport]} ${p.trainingTypes.join('+')}`}
        className="se-fr" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: titleSize, fontWeight: 600, padding: 0 }} />
      {/* Mémo imprimable — antisèche de la séance (une ligne par bloc / circuits). */}
      <button data-guide="builder-memo" type="button" onClick={p.onPrintMemo} aria-label="Mémo imprimable" title="Mémo imprimable"
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 999, border: `1px solid ${p.sportAccent}`, background: 'transparent', color: p.sportAccent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        <IconPrinter size={15} /> Mémo
      </button>
      {/* Dupliquer — répétition de la séance (à côté de Mémo). */}
      {p.onDuplicateRepeat && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" onClick={() => setDupOpen(o => !o)} aria-label="Dupliquer" title="Dupliquer la séance"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 999, border: `1px solid ${p.sportAccent}`, background: dupOpen ? p.sportAccent : 'transparent', color: dupOpen ? '#fff' : p.sportAccent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <IconCopy size={15} /> Dupliquer
          </button>
          {dupOpen && <DuplicatePopover accent={p.sportAccent} sport={p.sport} onApply={p.onDuplicateRepeat} onClose={() => setDupOpen(false)} />}
        </div>
      )}
      {!p.reserveMode && <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: planCol, border: `1px solid ${planCol}`, borderRadius: 999, padding: '3px 11px' }}>{t('planning.planPrefix')} {p.selPlan}</span>}
      <button type="button" onClick={p.onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'transparent', color: 'var(--se-dim)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

export function PanelFooter({ p, floating }: { p: SessionEditorPanelProps; floating?: boolean }) {
  const { t } = useI18n()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const wrap: React.CSSProperties = floating
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom))', pointerEvents: 'none' }
    : { flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--se-rule)', background: 'var(--se-bg)' }

  // Confirmation de suppression — remplace toute la barre.
  if (confirmDelete && p.onDelete) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', ...wrap }}>
        <span style={{ pointerEvents: 'auto', flex: 1, minWidth: 140, fontSize: 13.5, fontWeight: 600, color: 'var(--se-text)' }}>{t('planning.deleteSessionConfirm')}</span>
        <button type="button" onClick={() => setConfirmDelete(false)} style={footBtn}>{t('planning.cancel')}</button>
        <button type="button" onClick={p.onDelete} style={{ pointerEvents: 'auto', padding: '12px 22px', borderRadius: 999, border: 'none', background: 'var(--pat-hyrox)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>{t('planning.delete')}</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...wrap }}>
      <button type="button" onClick={p.onClose} style={footBtn}><IconChevronLeft size={15} /> {t('planning.close')}</button>
      <button type="button" onClick={p.onExportPDF} style={footIcon} aria-label={t('planning.exportPdf')}><IconFileText size={17} /></button>
      {!p.reserveMode && <button type="button" onClick={p.onFavorite} style={footIcon} aria-label={t('planning.saveFavorite')}><IconStar size={17} /></button>}
      {p.onDelete && <button type="button" onClick={() => setConfirmDelete(true)} style={footDanger} aria-label={t('planning.deleteSession')}><IconTrash size={17} /></button>}
      <div style={{ flex: 1 }} />
      <button data-guide="builder-add" type="button" onClick={p.onSave} disabled={p.saving} style={{ pointerEvents: 'auto', padding: '12px 24px', borderRadius: 999, border: 'none', background: p.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: p.saving ? 0.6 : 1, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
        {p.saved ? t('planning.savedCheck') : (p.reserveMode || p.mode === 'edit') ? t('planning.save') : t('planning.add')} →
      </button>
    </div>
  )
}

const footBtn: React.CSSProperties = { pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '10px 15px', borderRadius: 999, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }
const footIcon: React.CSSProperties = { pointerEvents: 'auto', width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }
const footDanger: React.CSSProperties = { ...footIcon, border: '1px solid var(--pat-hyrox)', color: 'var(--pat-hyrox)' }
