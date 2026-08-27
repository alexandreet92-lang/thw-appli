'use client'
// Bouton « Ajouter au planning » + bottom sheet : on choisit le niveau et
// N'IMPORTE QUELLE date (mini-calendrier qui montre le planning DÉJÀ en place
// + un jour recommandé). Puis « Suivant » ouvre l'éditeur de séance pré-rempli
// (allures/watts/reps ajustables) avant l'ajout dans planned_sessions.
import { useEffect, useState } from 'react'
import { IconCalendarPlus, IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { weekStartStr, mondayIndex } from '@/lib/date/weekStart'
import { emitNotification } from '@/lib/notifications/emit'
import { SessionEditor } from '@/components/planning/SessionEditor'
import type { Block, Session, SportType } from '@/app/planning/page'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const SPORT_DOT: Record<string, string> = { run: '#22c55e', bike: '#3b82f6', swim: '#06b6d4', gym: '#f97316', hyrox: '#ef4444', rowing: '#0ea5e9' }

export interface PlanNiveau { id: string; label: string }

interface Props {
  sport: 'run' | 'bike'
  title: string
  objectif?: string
  niveaux?: PlanNiveau[] | null
  defaultNiveau?: string | null
  computeMeta: (niveauId: string | null) => { durationMin: number; rpe: number }
  /** Fournit les blocs planning pour le niveau choisi → active l'étape « Suivant » (éditeur). */
  computeBlocks?: (niveauId: string | null) => Block[]
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function weekStartAndDayIndex(d: Date): { weekStart: string; dayIndex: number } {
  return { weekStart: weekStartStr(d), dayIndex: mondayIndex(d) }
}

interface DaySess { sport: string; title: string }

export function AddToPlanning({ sport, title, objectif, niveaux, defaultNiveau, computeMeta, computeBlocks }: Props) {
  const { t } = useI18n()
  const today = startOfDay(new Date())
  const [open, setOpen] = useState(false)
  const [niveau, setNiveau] = useState<string | null>(defaultNiveau ?? null)
  const [sel, setSel] = useState<Date>(today)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [planMap, setPlanMap] = useState<Record<string, DaySess[]>>({})
  const [editorSession, setEditorSession] = useState<Session | null>(null)

  // Charge le planning existant (8 semaines) pour l'afficher + suggérer un jour.
  useEffect(() => {
    if (!open) return
    let alive = true
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const fromMonday = weekStartStr(today)
        const { data } = await sb.from('planned_sessions').select('week_start, day_index, sport, title').eq('user_id', user.id).gte('week_start', fromMonday).limit(400)
        if (!alive || !data) return
        const map: Record<string, DaySess[]> = {}
        for (const r of data as { week_start: string; day_index: number; sport: string; title: string }[]) {
          const d = new Date(r.week_start + 'T00:00:00'); d.setDate(d.getDate() + r.day_index)
          const k = dateKey(d); (map[k] ??= []).push({ sport: r.sport, title: r.title })
        }
        setPlanMap(map)
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [open, today])

  // Jour recommandé : le moins chargé dans les 7 prochains jours.
  const suggested = (() => {
    let best: Date | null = null, bestLoad = Infinity
    for (let i = 1; i <= 7; i++) {
      const d = startOfDay(new Date(today)); d.setDate(today.getDate() + i)
      const load = (planMap[dateKey(d)] ?? []).length
      if (load < bestLoad) { bestLoad = load; best = d }
    }
    return best
  })()

  function reopen() {
    setNiveau(defaultNiveau ?? null); setSel(today); setView({ y: today.getFullYear(), m: today.getMonth() })
    setErrMsg(null); setDone(false); setOpen(true)
  }

  const canPrev = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth())
  function shiftMonth(delta: number) {
    const nm = view.m + delta
    const y = view.y + Math.floor(nm / 12)
    const m = ((nm % 12) + 12) % 12
    if (delta < 0 && (y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth()))) return
    setView({ y, m })
  }

  const first = new Date(view.y, view.m, 1)
  const lead = mondayIndex(first)
  const nbDays = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: nbDays }, (_, i) => new Date(view.y, view.m, i + 1)),
  ]

  const selLabel = `${t(`w2e.joursC.${mondayIndex(sel)}`)} ${sel.getDate()} ${t(`w2e.moisC.${sel.getMonth()}`)}`

  // Insertion directe (chemin hérité, sans éditeur).
  async function directAdd() {
    setSaving(true); setErrMsg(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setErrMsg(t('w2e.mustBeLoggedIn')); setSaving(false); return }
      const { weekStart, dayIndex } = weekStartAndDayIndex(sel)
      const meta = computeMeta(niveau)
      const nivLabel = niveaux?.find(n => n.id === niveau)?.label
      const notes = [objectif, nivLabel ? `Niveau ${nivLabel}` : null].filter(Boolean).join(' · ')
      const { error } = await sb.from('planned_sessions').insert({
        user_id: user.id, week_start: weekStart, day_index: dayIndex,
        sport, title, duration_min: meta.durationMin, status: 'planned', rpe: meta.rpe, notes, blocks: [], source: 'biblio',
      })
      if (error) { setErrMsg(error.message || t('w2e.addFailedRetry')); setSaving(false); return }
      afterAdd(weekStart, dayIndex); setSaving(false)
    } catch (e) { setErrMsg(e instanceof Error ? e.message : t('w2e.addFailed')); setSaving(false) }
  }

  // Étape « Suivant » : construit la séance (blocs convertis) et ouvre l'éditeur.
  function goToEditor() {
    const { weekStart, dayIndex } = weekStartAndDayIndex(sel)
    const meta = computeMeta(niveau)
    const nivLabel = niveaux?.find(n => n.id === niveau)?.label
    const notes = [objectif, nivLabel ? `Niveau ${nivLabel}` : null].filter(Boolean).join(' · ')
    const blocks = computeBlocks ? computeBlocks(niveau) : []
    setEditorSession({
      id: '', sport: sport as SportType, title, time: '09:00', durationMin: meta.durationMin,
      status: 'planned', notes, rpe: meta.rpe, dayIndex, weekStart, blocks, planVariant: 'A',
    } as Session)
    setOpen(false)
  }

  async function saveFromEditor(s: Session) {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const weekStart = s.weekStart ?? weekStartStr(today)
      const dayIndex = s.dayIndex ?? 0
      await sb.from('planned_sessions').insert({
        user_id: user.id, week_start: weekStart, day_index: dayIndex,
        sport: s.sport, title: s.title, time: s.time, duration_min: s.durationMin,
        status: 'planned', notes: s.notes ?? null, rpe: s.rpe ?? null, blocks: s.blocks ?? [],
        plan_variant: s.planVariant ?? 'A', source: 'biblio',
      })
      const d = new Date(weekStart + 'T00:00:00'); d.setDate(d.getDate() + dayIndex)
      afterAdd(weekStart, dayIndex)
      emitNotification({ key: 'entrainement.seance_telechargee', title: t('w2e.sessionAdded'), body: t('w2e.sessionAddedBody', { title: s.title }), url: '/planning', dedupKey: `dl:${user.id}:${weekStart}:${dayIndex}:${s.title}` })
    } catch { /* ignore */ }
    setEditorSession(null)
  }

  function afterAdd(weekStart: string, dayIndex: number) {
    emitNotification({
      key: 'entrainement.seance_telechargee', title: t('w2e.sessionDownloaded'),
      body: t('w2e.sessionDownloadedBody', { title, label: selLabel }), url: '/planning',
      dedupKey: `dl:${weekStart}:${dayIndex}:${title}`,
    })
    window.dispatchEvent(new Event('thw:sessions-changed'))
    setDone(true); setTimeout(() => { setOpen(false); setDone(false) }, 1200)
  }

  return (
    <>
      <button onClick={reopen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 999,
          border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)',
          fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }}>
        <IconCalendarPlus size={17} /> {t('w2e.addToPlanning')}
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={t('w2e.addToPlanning')}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-6) 0' }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={30} />
            </span>
            <p style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('w2e.added', { label: selLabel })}</p>
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 var(--space-5)', lineHeight: 1.4 }}>{title}</p>

            {niveaux && niveaux.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>{t('w2e.level')}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginTop: 'var(--space-3)' }}>
                  {niveaux.map(n => {
                    const on = niveau === n.id
                    return (
                      <button key={n.id} onClick={() => setNiveau(n.id)} style={{
                        padding: '9px 4px', borderRadius: 12, cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600,
                        border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        background: on ? 'var(--primary)' : 'var(--bg-card2)',
                        color: on ? 'var(--on-primary, #fff)' : 'var(--text-mid)', transition: 'all .15s' }}>{n.label}</button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Calendrier — montre le planning déjà en place + jour recommandé */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>{t('w2e.day')}</span>
                {suggested && sameDay(startOfDay(suggested), startOfDay(sel)) === false && (
                  <button onClick={() => { setSel(startOfDay(suggested)); setView({ y: suggested.getFullYear(), m: suggested.getMonth() }) }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontFamily: FB, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                    {t('w2e.recommendedDay', { day: `${t(`w2e.joursC.${mondayIndex(suggested)}`)} ${suggested.getDate()}` })}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 16, background: 'var(--bg-card2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <button onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label={t('w2e.prevMonth')} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: canPrev ? 'var(--bg-card)' : 'transparent', color: canPrev ? 'var(--text-mid)' : 'var(--text-dim)',
                    opacity: canPrev ? 1 : 0.35, cursor: canPrev ? 'pointer' : 'default' }}>
                    <IconChevronLeft size={18} />
                  </button>
                  <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t(`w2e.mois.${view.m}`)} {view.y}</span>
                  <button onClick={() => shiftMonth(1)} aria-label={t('w2e.nextMonth')} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-card)', color: 'var(--text-mid)', cursor: 'pointer' }}>
                    <IconChevronRight size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {WD.map((w, i) => <span key={i} style={{ textAlign: 'center', fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)' }}>{t(`w2e.wd.${i}`)}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {cells.map((d, i) => {
                    if (!d) return <span key={i} />
                    const past = startOfDay(d) < today
                    const on = sameDay(d, sel)
                    const isToday = sameDay(d, today)
                    const isSug = suggested != null && sameDay(d, suggested)
                    const daySess = planMap[dateKey(d)] ?? []
                    return (
                      <button key={i} onClick={() => !past && setSel(startOfDay(d))} disabled={past} title={daySess.map(s => s.title).join(' · ')} style={{
                        aspectRatio: '1', borderRadius: 12, position: 'relative',
                        border: on ? 'none' : isSug ? '1.5px solid var(--primary)' : isToday ? '1.5px solid var(--text-dim)' : 'none',
                        background: on ? 'var(--primary)' : daySess.length ? 'var(--bg-card)' : 'transparent',
                        color: on ? 'var(--on-primary, #fff)' : past ? 'var(--text-dim)' : 'var(--text)',
                        opacity: past ? 0.3 : 1, cursor: past ? 'default' : 'pointer',
                        fontFamily: FB, fontSize: 13.5, fontWeight: on ? 700 : 500,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'background .12s' }}>
                        {d.getDate()}
                        {daySess.length > 0 && (
                          <span style={{ display: 'flex', gap: 2 }}>
                            {daySess.slice(0, 3).map((s, j) => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: on ? '#fff' : (SPORT_DOT[s.sport] ?? 'var(--text-dim)') }} />)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {(planMap[dateKey(sel)]?.length ?? 0) >= 2 && (
                <p style={{ fontFamily: FB, fontSize: 11.5, color: '#f97316', margin: 'var(--space-2) 0 0', fontWeight: 600 }}>
                  {t('w2e.alreadyNSessions', { n: planMap[dateKey(sel)]!.length })}
                </p>
              )}
            </div>

            {errMsg && <p style={{ fontFamily: FB, fontSize: 12.5, color: '#ef4444', margin: '0 0 var(--space-3)' }}>{errMsg}</p>}

            <button onClick={computeBlocks ? goToEditor : directAdd} disabled={saving} style={{
              width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none',
              cursor: saving ? 'default' : 'pointer', background: 'var(--primary)', color: 'var(--on-primary, #fff)',
              fontFamily: FB, fontSize: 14.5, fontWeight: 700, opacity: saving ? 0.6 : 1,
              boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' }}>
              {computeBlocks ? t('w2e.nextSetBlocks') : saving ? t('w2e.adding') : t('w2e.addWithDate', { label: selLabel })}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Étape 2 : éditeur pré-rempli — l'athlète ajuste allures/watts/reps. */}
      {editorSession && (
        <SessionEditor
          mode="create"
          session={editorSession}
          dayIndex={editorSession.dayIndex}
          weekStart={editorSession.weekStart}
          plan="A"
          onClose={() => setEditorSession(null)}
          onSave={saveFromEditor}
        />
      )}
    </>
  )
}
