'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeLauncher — on NE crée PAS de séance ici. On affiche uniquement les séances
// de boxe PLANIFIÉES cette semaine (planned_sessions sport='boxe'), avec leur
// structure (circuits / rounds / exercices) lue depuis validation_data. On clique
// une séance → elle s'ouvre et se lance dans le lecteur en direct.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { weekStartStr } from '@/lib/date/weekStart'
import { sumComposedMinutes, type ComposedMove, type ComposedCircuit, type ComposedSport } from '@/components/planning/composedSports'
import type { BoxeSession } from './boxe/buildBoxeTimeline'
import LaunchSheet from './kit/LaunchSheet'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (session: BoxeSession) => void
  sport?: ComposedSport   // 'boxe' (défaut) ou 'hybrid' — même lecteur composé
}

interface PlannedRow {
  id: string; title: string | null; day_index: number; week_start: string
  validation_data: { composed?: ComposedMove[]; composedCircuits?: ComposedCircuit[]; composedCircuit?: ComposedCircuit } | null
}
interface PlannedBoxe { id: string; title: string; dayIndex: number; weekStart: string; moves: ComposedMove[]; circuits: ComposedCircuit[]; minutes: number }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function BoxeLauncher({ open, onClose, onStart, sport = 'boxe' }: Props) {
  const { t } = useI18n()
  const SPORT_LABEL = sport === 'hybrid' ? 'Hybrid' : 'Boxe'
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<PlannedBoxe[]>([])   // toutes les séances du sport
  const [thisWeek, setThisWeek] = useState<PlannedBoxe[]>([])   // planifiées cette semaine

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
          .select('id, title, day_index, week_start, validation_data')
          .eq('user_id', user.id).eq('sport', sport)
          .order('week_start', { ascending: false }).order('day_index', { ascending: true })
        if (cancelled) return
        const rows = (data ?? []) as PlannedRow[]
        const wk = weekStartStr(new Date())
        const mapped: PlannedBoxe[] = rows.map(r => {
          const vd = r.validation_data ?? {}
          const moves = vd.composed ?? []
          const circuits = vd.composedCircuits ?? (vd.composedCircuit ? [vd.composedCircuit] : [])
          return { id: r.id, title: r.title || `Séance ${SPORT_LABEL.toLowerCase()}`, dayIndex: r.day_index, weekStart: r.week_start, moves, circuits, minutes: sumComposedMinutes(moves, circuits) }
        })
        setSessions(mapped)
        setThisWeek(mapped.filter(m => m.weekStart === wk))
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [open])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 300) }

  if (!mounted || !open) return null

  const pick = (s: PlannedBoxe) => () => { onStart({ title: s.title, moves: s.moves, circuits: s.circuits, sport }); handleClose() }
  const item = (s: PlannedBoxe) => ({
    id: s.id, title: s.title, day: DAYS[s.dayIndex] ?? '', onPick: pick(s),
    sub: `${s.circuits.length > 0 ? `${s.circuits.length} circuit${s.circuits.length > 1 ? 's' : ''} · ` : ''}${s.moves.length} exo${s.moves.length > 1 ? 's' : ''}${s.minutes > 0 ? ` · ≈ ${s.minutes} min` : ''}`,
  })

  return (
    <LaunchSheet
      open={!closing} onClose={handleClose}
      title={SPORT_LABEL} sub="Choisis une séance à lancer, ou démarre sans programme."
      color={sport === 'hybrid' ? 'var(--sport-hyrox)' : 'var(--sport-gym)'}
      loading={loading}
      week={thisWeek.map(item)} all={sessions.map(item)}
      weekEmpty={`Aucune séance de ${SPORT_LABEL.toLowerCase()} planifiée cette semaine.`}
      allEmpty={`Aucune séance de ${SPORT_LABEL.toLowerCase()} créée. Crée-en une dans ton planning.`}
      freeLabel="Lancer sans programme"
      onFree={() => { onStart({ title: `Séance ${SPORT_LABEL.toLowerCase()} libre`, moves: [], circuits: [], sport, free: true }); handleClose() }}
    />
  )
}
