'use client'
// Bouton « Ajouter au planning » + bottom sheet : on choisit le niveau et
// N'IMPORTE QUELLE date à partir d'aujourd'hui (mini-calendrier), puis on
// insère une séance planifiée (table planned_sessions).
import { useState } from 'react'
import { IconCalendarPlus, IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const JOURS_C = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

export interface PlanNiveau { id: string; label: string }

interface Props {
  sport: 'run' | 'bike'
  title: string
  objectif?: string
  niveaux?: PlanNiveau[] | null
  defaultNiveau?: string | null
  computeMeta: (niveauId: string | null) => { durationMin: number; rpe: number }
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7   // 0 = lundi

// Lundi (YYYY-MM-DD) + index de jour (0 = lundi). Même formule que le reste de
// l'app (getWeekStart : monday.toISOString()) → même « bucket » de semaine.
function weekStartAndDayIndex(d: Date): { weekStart: string; dayIndex: number } {
  const dayIndex = mondayIndex(d)
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayIndex)
  return { weekStart: monday.toISOString().split('T')[0], dayIndex }
}

export function AddToPlanning({ sport, title, objectif, niveaux, defaultNiveau, computeMeta }: Props) {
  const today = startOfDay(new Date())
  const [open, setOpen] = useState(false)
  const [niveau, setNiveau] = useState<string | null>(defaultNiveau ?? null)
  const [sel, setSel] = useState<Date>(today)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

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

  // Grille du mois affiché (lundi → dimanche).
  const first = new Date(view.y, view.m, 1)
  const lead = mondayIndex(first)
  const nbDays = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: nbDays }, (_, i) => new Date(view.y, view.m, i + 1)),
  ]

  async function confirm() {
    setSaving(true); setErrMsg(null)
    try {
      const sb = createClient()
      // uid depuis la session locale (fiable), fallback getUser.
      let uid: string | null = null
      const { data: s } = await sb.auth.getSession()
      uid = s.session?.user?.id ?? null
      if (!uid) { const { data: u } = await sb.auth.getUser(); uid = u.user?.id ?? null }
      if (!uid) { setErrMsg('Tu dois être connecté pour ajouter une séance.'); setSaving(false); return }

      const { weekStart, dayIndex } = weekStartAndDayIndex(sel)
      const meta = computeMeta(niveau)
      const nivLabel = niveaux?.find(n => n.id === niveau)?.label
      const notes = [objectif, nivLabel ? `Niveau ${nivLabel}` : null].filter(Boolean).join(' · ')
      const { error } = await sb.from('planned_sessions').insert({
        user_id: uid, week_start: weekStart, day_index: dayIndex,
        sport, title, duration_min: meta.durationMin, status: 'planned',
        rpe: meta.rpe, notes, blocks: [], source: 'biblio',
      })
      if (error) { setErrMsg(error.message || 'Ajout impossible. Réessaie.'); setSaving(false); return }
      window.dispatchEvent(new Event('thw:sessions-changed'))
      setDone(true); setSaving(false)
      setTimeout(() => { setOpen(false); setDone(false) }, 1200)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Ajout impossible. Réessaie.'); setSaving(false)
    }
  }

  const selLabel = `${JOURS_C[mondayIndex(sel)]} ${sel.getDate()} ${MOIS_C[sel.getMonth()]}`

  return (
    <>
      <button onClick={reopen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 999,
          border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)',
          fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }}>
        <IconCalendarPlus size={17} /> Ajouter au planning
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Ajouter au planning">
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-6) 0' }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={30} />
            </span>
            <p style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Ajoutée · {selLabel}</p>
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 var(--space-5)', lineHeight: 1.4 }}>{title}</p>

            {/* Niveau */}
            {niveaux && niveaux.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>Niveau</span>
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

            {/* Calendrier — n'importe quelle date à partir d'aujourd'hui */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>Jour</span>
              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 16, background: 'var(--bg-card2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <button onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label="Mois précédent" style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: canPrev ? 'var(--bg-card)' : 'transparent', color: canPrev ? 'var(--text-mid)' : 'var(--text-dim)',
                    opacity: canPrev ? 1 : 0.35, cursor: canPrev ? 'pointer' : 'default' }}>
                    <IconChevronLeft size={18} />
                  </button>
                  <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{MOIS[view.m]} {view.y}</span>
                  <button onClick={() => shiftMonth(1)} aria-label="Mois suivant" style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-card)', color: 'var(--text-mid)', cursor: 'pointer' }}>
                    <IconChevronRight size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {WD.map((w, i) => <span key={i} style={{ textAlign: 'center', fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)' }}>{w}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {cells.map((d, i) => {
                    if (!d) return <span key={i} />
                    const past = startOfDay(d) < today
                    const on = sameDay(d, sel)
                    const isToday = sameDay(d, today)
                    return (
                      <button key={i} onClick={() => !past && setSel(startOfDay(d))} disabled={past} style={{
                        aspectRatio: '1', borderRadius: '50%', border: isToday && !on ? '1.5px solid var(--primary)' : 'none',
                        background: on ? 'var(--primary)' : 'transparent',
                        color: on ? 'var(--on-primary, #fff)' : past ? 'var(--text-dim)' : 'var(--text)',
                        opacity: past ? 0.3 : 1, cursor: past ? 'default' : 'pointer',
                        fontFamily: FB, fontSize: 13.5, fontWeight: on ? 700 : 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}>
                        {d.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {errMsg && <p style={{ fontFamily: FB, fontSize: 12.5, color: '#ef4444', margin: '0 0 var(--space-3)' }}>{errMsg}</p>}

            <button onClick={confirm} disabled={saving} style={{
              width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none',
              cursor: saving ? 'default' : 'pointer', background: 'var(--primary)', color: 'var(--on-primary, #fff)',
              fontFamily: FB, fontSize: 14.5, fontWeight: 700, opacity: saving ? 0.6 : 1,
              boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' }}>
              {saving ? 'Ajout…' : `Ajouter · ${selLabel}`}
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
