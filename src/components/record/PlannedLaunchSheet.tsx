'use client'
// ══════════════════════════════════════════════════════════════════
// PlannedLaunchSheet — launcher générique aligné sur la muscu : 3 sections
//   • Week training   : séances planifiées cette semaine (week_start = lundi)
//   • Session training: toutes les séances créées de ce sport
//   • No training     : lancer sans programme
// On NE crée PAS de séance ici. Générique par `sport` (valeur DB) — utilisé
// pour le rameur (sport='rowing') et le home trainer (sport='bike').
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { weekStartStr } from '@/lib/date/weekStart'

export interface PlannedLaunchRow {
  id: string
  title: string
  dayIndex: number
  weekStart: string
  blocks: unknown[]
  validationData: Record<string, unknown>
}

interface Props {
  open: boolean
  onClose: () => void
  sport: string            // valeur DB : 'rowing' | 'bike'
  label: string            // 'Rameur' | 'Home trainer'
  accent: string
  onPick: (row: PlannedLaunchRow) => void
  onFree: () => void
  freeLabel?: string
  // Filtre optionnel : ne garder que les séances dont validation_data.cyclingSub
  // correspond (ex. 'ht'). Si absent → toutes les séances du sport.
  subFilter?: string
}

interface DbRow {
  id: string; title: string | null; day_index: number; week_start: string
  blocks: unknown[] | null; validation_data: Record<string, unknown> | null
}

export default function PlannedLaunchSheet({ open, onClose, sport, label, accent, onPick, onFree, freeLabel, subFilter }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [all, setAll] = useState<PlannedLaunchRow[]>([])
  const [thisWeek, setThisWeek] = useState<PlannedLaunchRow[]>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const { data } = await sb.from('planned_sessions')
          .select('id, title, day_index, week_start, blocks, validation_data')
          .eq('user_id', user.id).eq('sport', sport)
          .order('week_start', { ascending: false }).order('day_index', { ascending: true })
        if (cancelled) return
        const wk = weekStartStr(new Date())
        let rows = (data ?? []) as DbRow[]
        if (subFilter) rows = rows.filter(r => (r.validation_data?.cyclingSub as string | undefined) === subFilter)
        const mapped: PlannedLaunchRow[] = rows.map(r => ({
          id: r.id, title: r.title || t('w3b.session_of', { label: label.toLowerCase() }), dayIndex: r.day_index,
          weekStart: r.week_start, blocks: r.blocks ?? [], validationData: r.validation_data ?? {},
        }))
        setAll(mapped)
        setThisWeek(mapped.filter(m => m.weekStart === wk))
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [open, sport, subFilter, label, t])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  if (!mounted || !open) return null

  const rowSubtitle = (r: PlannedLaunchRow) => {
    const n = Array.isArray(r.blocks) ? r.blocks.length : 0
    return n > 0 ? (n > 1 ? t('w3b.blocks_n', { n }) : t('w3b.block_n', { n })) : t('w3b.session')
  }

  const Row = ({ r }: { r: PlannedLaunchRow }) => (
    <button onClick={() => { onPick(r); handleClose() }}
      style={{ textAlign: 'left', padding: '15px 16px', borderRadius: 16, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', gap: 13, width: '100%' }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
        {r.dayIndex >= 0 && r.dayIndex <= 6 ? t(`w3b.day_${r.dayIndex}`) : ''}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{rowSubtitle(r)}</span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )

  return createPortal(
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'plsScrim .2s ease' }} />
      <div data-guide="rec-planned" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10001,
        background: 'var(--bg-card)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
        maxHeight: '86dvh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
        animation: closing ? 'plsDown .23s ease forwards' : 'plsUp .3s cubic-bezier(.2,.8,.2,1)',
      }}>
        <style>{`@keyframes plsScrim{from{opacity:0}to{opacity:1}}@keyframes plsUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes plsDown{from{transform:translateY(0)}to{transform:translateY(100%)}}`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{ padding: '14px 20px 6px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>{label}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w3b.choose_session')}</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0' }}>{t('w3b.loading')}</p>
          ) : (
            <>
              <SectionLabel>Training Planning</SectionLabel>
              {thisWeek.length === 0 ? (
                <EmptyHint>{t('w3b.empty_week', { label: label.toLowerCase() })}</EmptyHint>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {thisWeek.map(r => <Row key={r.id} r={r} />)}
                </div>
              )}

              <SectionLabel>Training Session</SectionLabel>
              {all.length === 0 ? (
                <EmptyHint>{t('w3b.empty_created', { label: label.toLowerCase() })}</EmptyHint>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {all.map(r => <Row key={r.id} r={r} />)}
                </div>
              )}

              <SectionLabel>No Training</SectionLabel>
              <button onClick={() => { onFree(); handleClose() }}
                style={{ width: '100%', padding: '15px 16px', borderRadius: 16, cursor: 'pointer', border: `1px solid ${accent}`, background: `${accent}12`, color: accent, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {freeLabel ?? t('w3b.launch_no_program')}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{children}</p>
}
function EmptyHint({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 20px', lineHeight: 1.5 }}>{children}</p>
}
