'use client'
// ══════════════════════════════════════════════════════════════════════════
// Carte de séance partagée (snapshot) — carte blanche, tuile sport teintée.
// Clic → feuille détail (blocs/exos) avec deux actions :
//   • Copier dans ma bibliothèque (session_favorites)
//   • Ajouter à mon planning à une date choisie (planned_sessions)
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Dumbbell, ChevronRight, Copy, CalendarPlus, Check } from 'lucide-react'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { copySessionToLibrary, addSessionToPlanning } from '@/lib/community/sessions'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { CmSheet, CmPill, CmCard, CmLabel, CARD_BG, SOFT_SHADOW, TNUM, FB, stagger } from './kit'
import type { SessionRef } from '@/types/community'
import type { Block } from '@/app/planning/page'

function fmtDuration(min: number | null): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

type Tr = (key: string, vars?: Record<string, string | number>) => string
const KNOWN_BLOCK_TYPES = new Set(['warmup', 'effort', 'recovery', 'cooldown', 'circuit_header'])
function blockTitle(b: Block, t: Tr): string {
  const label = b.label?.trim()
  if (label) return label
  return KNOWN_BLOCK_TYPES.has(b.type) ? t(`w3e.blocktype_${b.type}`) : t('w3e.block_default')
}
function blockDetail(b: Block, t: Tr): string {
  const p: string[] = []
  if ((b.mode === 'interval' || b.mode === 'series' || b.mode === 'circuit' || b.mode === 'emom' || b.mode === 'tabata') && b.reps) p.push(`${b.reps} ×`)
  if (b.effortMin && b.effortMin > 0) p.push(`${b.effortMin} min`)
  else if (b.durationMin && b.durationMin > 0) p.push(`${b.durationMin} min`)
  if (b.zone) p.push(`Z${b.zone}`)
  if (b.value?.trim()) p.push(b.value.trim())
  if (b.cadence?.trim()) p.push(`${b.cadence} rpm`)
  if (b.inclinePct) p.push(`${b.inclinePct}%`)
  if (b.recoveryMin && b.recoveryMin > 0) p.push(`${t('w3e.recovery_abbr')} ${b.recoveryMin} min${b.recoveryZone ? ` Z${b.recoveryZone}` : ''}`)
  return p.join(' · ')
}

export function SessionCard({ session }: { session: SessionRef }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const col = sportColor(session.sport)
  const meta = [sportLabel(session.sport), fmtDuration(session.durationMin), session.blocks.length ? (session.blocks.length > 1 ? t('w3e.block_count_other', { n: session.blocks.length }) : t('w3e.block_count_one', { n: session.blocks.length })) : null, session.rpe ? `RPE ${session.rpe}` : null].filter(Boolean) as string[]

  return (
    <>
      <button type="button" onClick={() => { haptic('light'); setOpen(true) }} className="cm-btn cm-press"
        style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', maxWidth: 360, textAlign: 'left', background: CARD_BG, borderRadius: 'var(--r-lg)', padding: 12, boxShadow: SOFT_SHADOW, fontFamily: FB }}>
        <span style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, background: `color-mix(in srgb, ${col} 14%, transparent)` }}>
          <Dumbbell size={21} strokeWidth={2.2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('w3e.session_label')}</span>
          <span style={{ display: 'block', fontSize: 15.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{session.title}</span>
          <span style={{ ...TNUM, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.join(' · ')}</span>
        </span>
        <ChevronRight size={18} strokeWidth={2} color="var(--text-dim)" style={{ flexShrink: 0 }} />
      </button>
      {open && <SessionDetailSheet session={session} onClose={() => setOpen(false)} />}
    </>
  )
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SessionDetailSheet({ session, onClose }: { session: SessionRef; onClose: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState<null | 'copy' | 'plan'>(null)
  const [done, setDone] = useState<null | string>(null)
  const [planning, setPlanning] = useState(false)
  const [date, setDate] = useState(todayStr())
  const col = sportColor(session.sport)

  async function doCopy() {
    setBusy('copy'); setDone(null)
    const ok = await copySessionToLibrary(session)
    setBusy(null); setDone(ok ? t('w3e.session_copied') : t('w3e.copy_failed_retry'))
    if (ok) haptic('success')
  }
  async function doPlan() {
    setBusy('plan'); setDone(null)
    const [y, m, d] = date.split('-').map(Number)
    const ok = await addSessionToPlanning(session, new Date(y, m - 1, d))
    setBusy(null)
    if (ok) { haptic('success'); setPlanning(false); setDone(t('w3e.session_planned')) }
    else setDone(t('w3e.add_failed_retry'))
  }

  const meta = [sportLabel(session.sport), fmtDuration(session.durationMin), session.rpe ? `RPE ${session.rpe}` : null].filter(Boolean) as string[]

  return (
    <CmSheet onClose={onClose} title={session.title} sub={meta.join(' · ')} zIndex={15700}
      footer={
        <>
          {done && <p className="cm-in" style={{ margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 650, color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Check size={15} strokeWidth={2.6} />{done}</p>}
          {planning ? (
            <div className="cm-in" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} className="cm-input" style={{ flex: 1 }} />
              <CmPill variant="primary" disabled={busy === 'plan'} onClick={() => void doPlan()} height={50}>{busy === 'plan' ? t('w3e.adding') : t('w3e.confirm')}</CmPill>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <CmPill variant="chip" disabled={busy === 'copy'} onClick={() => void doCopy()} height={52} style={{ flex: 1 }}><Copy size={17} strokeWidth={2.2} />{busy === 'copy' ? t('w3e.copying') : t('w3e.copy_to_library')}</CmPill>
              <CmPill variant="primary" onClick={() => { setPlanning(true); setDone(null) }} height={52} style={{ flex: 1 }}><CalendarPlus size={17} strokeWidth={2.2} />{t('w3e.add_to_planning')}</CmPill>
            </div>
          )}
        </>
      }>
      {session.trainingTypes?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 6px' }}>
          {session.trainingTypes.map(tt => <span key={tt} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--surface-chip)', padding: '4px 10px', borderRadius: 'var(--r-pill)' }}>{tt}</span>)}
        </div>
      ) : null}
      {session.blocks.length === 0 ? (
        <p style={{ fontSize: 14.5, color: 'var(--text-mid)', padding: '16px 4px' }}>{t('w3e.no_detailed_block')}</p>
      ) : (
        <CmCard style={{ overflow: 'hidden', marginTop: 6 }}>
          {session.blocks.map((b, i) => {
            const detail = blockDetail(b, t)
            return (
              <div key={b.id || i} className="cm-in" style={{ ...stagger(i, 0, 26), display: 'flex', gap: 12, alignItems: 'center', minHeight: 56, padding: '10px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ ...TNUM, width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, color: col, background: `color-mix(in srgb, ${col} 14%, transparent)` }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{blockTitle(b, t)}</div>
                  {detail && <div style={{ ...TNUM, fontSize: 13.5, color: 'var(--text-mid)', marginTop: 2 }}>{detail}</div>}
                </div>
              </div>
            )
          })}
        </CmCard>
      )}
      {session.notes?.trim() && (
        <p style={{ fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: '14px 4px 0' }}>{session.notes.trim()}</p>
      )}
      {session.nutritionItems?.length ? (
        <>
          <CmLabel>{t('w3e.nutrition')}</CmLabel>
          <CmCard style={{ overflow: 'hidden' }}>
            {session.nutritionItems.map((n, i) => (
              <div key={n.id || i} style={{ ...TNUM, display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '8px 16px', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 14.5, color: 'var(--text)' }}>
                <span style={{ width: 54, color: 'var(--text-mid)', fontWeight: 700 }}>{n.timeMin} min</span>
                <span style={{ flex: 1, minWidth: 0 }}>{n.name || n.type}</span>
                <span style={{ color: 'var(--text-mid)' }}>{n.quantity}</span>
              </div>
            ))}
          </CmCard>
        </>
      ) : null}
    </CmSheet>
  )
}
