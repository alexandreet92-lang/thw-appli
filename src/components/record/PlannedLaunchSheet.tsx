'use client'
// ══════════════════════════════════════════════════════════════════
// PlannedLaunchSheet — launcher générique aligné sur la muscu : 3 sections
//   • Week training   : séances planifiées cette semaine (week_start = lundi)
//   • Session training: toutes les séances créées de ce sport
//   • No training     : lancer sans programme
// On NE crée PAS de séance ici. Générique par `sport` (valeur DB) — utilisé
// pour le rameur (sport='rowing') et le home trainer (sport='bike').
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import LaunchSheet from './kit/LaunchSheet'
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

  const handleClose = () => { setClosing(true); setTimeout(onClose, 300) }

  if (!mounted || !open) return null

  const rowSubtitle = (r: PlannedLaunchRow) => {
    const n = Array.isArray(r.blocks) ? r.blocks.length : 0
    return n > 0 ? (n > 1 ? t('w3b.blocks_n', { n }) : t('w3b.block_n', { n })) : t('w3b.session')
  }
  const item = (r: PlannedLaunchRow) => ({
    id: r.id, title: r.title, sub: rowSubtitle(r),
    day: r.dayIndex >= 0 && r.dayIndex <= 6 ? t(`w3b.day_${r.dayIndex}`) : '',
    onPick: () => { onPick(r); handleClose() },
  })

  return (
    <LaunchSheet
      open={!closing} onClose={handleClose}
      title={label} sub={t('w3b.choose_session')}
      color={accent} loading={loading}
      week={thisWeek.map(item)} all={all.map(item)}
      weekEmpty={t('w3b.empty_week', { label: label.toLowerCase() })}
      allEmpty={t('w3b.empty_created', { label: label.toLowerCase() })}
      freeLabel={freeLabel ?? t('w3b.launch_no_program')}
      onFree={() => { onFree(); handleClose() }}
      guide="rec-planned"
    />
  )
}
