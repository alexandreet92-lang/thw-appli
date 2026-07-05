'use client'
// Petit bouton « Ajouter au planning » + bottom sheet : on choisit le jour
// et le niveau, puis on insère une séance planifiée (table planned_sessions).
import { useState } from 'react'
import { IconCalendarPlus, IconCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export interface PlanNiveau { id: string; label: string }

interface Props {
  sport: 'run' | 'bike'
  title: string
  objectif?: string
  niveaux?: PlanNiveau[] | null
  defaultNiveau?: string | null
  // Durée (min) + RPE de la séance pour un niveau donné (null = pas de niveaux).
  computeMeta: (niveauId: string | null) => { durationMin: number; rpe: number }
}

// Lundi (YYYY-MM-DD) + index de jour (0 = lundi). Même formule que le reste de
// l'app (getWeekStart : monday.toISOString()) pour que la séance tombe dans le
// même « bucket » de semaine que celui lu par le planning.
function weekStartAndDayIndex(d: Date): { weekStart: string; dayIndex: number } {
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  return { weekStart: monday.toISOString().split('T')[0], dayIndex: dow }
}

export function AddToPlanning({ sport, title, objectif, niveaux, defaultNiveau, computeMeta }: Props) {
  const [open, setOpen] = useState(false)
  const [niveau, setNiveau] = useState<string | null>(defaultNiveau ?? null)
  const [dayOffset, setDayOffset] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState(false)

  // 14 prochains jours à partir d'aujourd'hui.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  })

  async function confirm() {
    setSaving(true); setErr(false)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setErr(true); setSaving(false); return }
      const d = days[dayOffset]
      const { weekStart, dayIndex } = weekStartAndDayIndex(d)
      const meta = computeMeta(niveau)
      const nivLabel = niveaux?.find(n => n.id === niveau)?.label
      const notes = [objectif, nivLabel ? `Niveau ${nivLabel}` : null, 'Ajoutée depuis la bibliothèque'].filter(Boolean).join(' · ')
      const { error } = await sb.from('planned_sessions').insert({
        user_id: user.id, week_start: weekStart, day_index: dayIndex,
        sport, title, duration_min: meta.durationMin, status: 'planned',
        rpe: meta.rpe, notes, blocks: [],
      })
      if (error) { setErr(true); setSaving(false); return }
      window.dispatchEvent(new Event('thw:sessions-changed'))
      setDone(true); setSaving(false)
      setTimeout(() => { setOpen(false); setDone(false) }, 1200)
    } catch {
      setErr(true); setSaving(false)
    }
  }

  const selected = days[dayOffset]
  const selectedLabel = `${JOURS[selected.getDay() === 0 ? 6 : selected.getDay() - 1]} ${selected.getDate()} ${MOIS[selected.getMonth()]}`

  return (
    <>
      <button onClick={() => { setNiveau(defaultNiveau ?? null); setOpen(true) }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--primary)', background: 'var(--primary-dim)', color: 'var(--primary)',
          fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <IconCalendarPlus size={17} /> Ajouter au planning
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Ajouter au planning">
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 'var(--space-6) 0' }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={26} />
            </span>
            <p style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Ajoutée le {selectedLabel}</p>
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 var(--space-4)' }}>{title}</p>

            {/* Niveau */}
            {niveaux && niveaux.length > 0 && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Niveau</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {niveaux.map(n => (
                    <button key={n.id} onClick={() => setNiveau(n.id)} style={{
                      padding: '7px 13px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600,
                      border: `1px solid ${niveau === n.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: niveau === n.id ? 'var(--primary-dim)' : 'var(--bg-card2)',
                      color: niveau === n.id ? 'var(--primary)' : 'var(--text-mid)' }}>{n.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Jour */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Jour</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
                {days.map((d, i) => {
                  const active = i === dayOffset
                  const jour = JOURS[d.getDay() === 0 ? 6 : d.getDay() - 1]
                  return (
                    <button key={i} onClick={() => setDayOffset(i)} style={{
                      flexShrink: 0, width: 52, padding: '8px 0', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary-dim)' : 'var(--bg-card2)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text-dim)' }}>{i === 0 ? 'Auj.' : jour}</span>
                      <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text)' }}>{d.getDate()}</span>
                      <span style={{ fontFamily: FB, fontSize: 9.5, color: active ? 'var(--primary)' : 'var(--text-dim)' }}>{MOIS[d.getMonth()]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {err && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--danger, #ef4444)', margin: '0 0 var(--space-3)' }}>Impossible d’ajouter la séance. Réessaie.</p>}

            <button onClick={confirm} disabled={saving} style={{
              width: '100%', padding: '12px 16px', borderRadius: 'var(--r-sm)', border: 'none',
              cursor: saving ? 'default' : 'pointer', background: 'var(--primary)', color: 'var(--on-primary, #fff)',
              fontFamily: FB, fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Ajout…' : `Ajouter le ${selectedLabel}`}
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
