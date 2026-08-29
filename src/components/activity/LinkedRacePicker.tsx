'use client'
// ══════════════════════════════════════════════════════════════════
// LinkedRacePicker — quand une activité est marquée « Course », relie-la à une
// COURSE du calendrier (planned_races). Plusieurs activités peuvent pointer la
// même course (ex. vélo + cap d'un Ironman) → elles apparaissent enchaînées.
// Stocke activities.linked_race_id (+ race_name pour l'affichage rapide).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { SportIcon } from '@/components/icons/SportIcon'

interface RaceOpt { id: string; name: string; date: string; sport: string; end_date?: string | null }

// Jours d'un objectif multi-jours [start, end] → YYYY-MM-DD.
function daysBetween(start: string, end: string): string[] {
  if (!start || !end || start > end) return [start]
  const out: string[] = []; const cur = new Date(start + 'T12:00:00'); const fin = new Date(end + 'T12:00:00')
  while (cur <= fin) { out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`); cur.setDate(cur.getDate() + 1) }
  return out
}
interface Sibling { id: string; title: string | null; sport_type: string | null; distance_m: number | null; moving_time_s: number | null; started_at: string | null }

function fmtDur(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}
function fmtKm(m: number | null): string { return m ? `${(m / 1000).toFixed(1)} km` : '' }

// Pour un objectif TRIATHLON (3 sports), on nomme la ligne « Objectif + segment »
// selon le sport de l'activité : « Ironman Leeds Natation », « … Vélo », « … Course ».
function triSegmentLabel(sport?: string | null): string {
  const s = (sport ?? '').toLowerCase()
  if (/swim|natation|openwater|eau/.test(s)) return 'Natation'
  if (/bike|cycl|velo|vélo|ride|vtt|mtb|home ?trainer|hometrainer/.test(s)) return 'Vélo'
  if (/run|course|trail|tapis|treadmill|cap/.test(s)) return 'Course'
  return ''
}

export function LinkedRacePicker({ activityId, activityDate, activitySport, initialRaceId, initialRaceDate }: {
  activityId: string
  activityDate?: string | null
  activitySport?: string | null
  initialRaceId?: string | null
  initialRaceDate?: string | null
}) {
  const { t } = useI18n()
  const [races, setRaces] = useState<RaceOpt[]>([])
  const [sel, setSel] = useState<string>(initialRaceId ?? '')
  const [selDate, setSelDate] = useState<string>(initialRaceDate ?? '')
  const [loading, setLoading] = useState(true)
  const [siblings, setSiblings] = useState<Sibling[]>([])

  // Activités enchaînées : toutes celles liées à la même course (ordre chrono).
  const loadSiblings = useCallback(async (raceId: string) => {
    if (!raceId) { setSiblings([]); return }
    try {
      const { data } = await createClient().from('activities')
        .select('id,title,sport_type,distance_m,moving_time_s,started_at')
        .eq('linked_race_id', raceId).order('started_at', { ascending: true })
      setSiblings((data as Sibling[]) ?? [])
    } catch { setSiblings([]) }
  }, [])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { session } } = await sb.auth.getSession()
        const uid = session?.user?.id
        if (!uid) { setLoading(false); return }
        const { data } = await sb.from('planned_races').select('id,name,date,sport,end_date').eq('user_id', uid).order('date', { ascending: false }).limit(200)
        if (!cancel && data) setRaces(data as RaceOpt[])
      } catch { /* silencieux */ }
      finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, [])

  useEffect(() => { void loadSiblings(sel) }, [sel, loadSiblings])

  async function save(raceId: string, day?: string) {
    setSel(raceId)
    const race = races.find(r => r.id === raceId)
    // Multi-jours : par défaut le 1er jour de la plage si aucun jour choisi.
    const isMulti = !!race?.end_date && race.end_date > race.date
    const raceDate = raceId ? (day ?? (isMulti ? (activityDate && activityDate >= race!.date && activityDate <= race!.end_date! ? activityDate.slice(0, 10) : race!.date) : null)) : null
    setSelDate(raceDate ?? '')
    // Triathlon → on stocke « Objectif + segment » (sport de l'activité).
    const seg = race?.sport === 'triathlon' ? triSegmentLabel(activitySport) : ''
    const composedName = race ? (seg ? `${race.name} ${seg}` : race.name) : null
    try {
      await createClient().from('activities')
        .update({ linked_race_id: raceId || null, race_name: composedName, linked_race_date: raceDate })
        .eq('id', activityId)
    } catch (e) { console.error('[linked_race] save', e) }
    void loadSiblings(raceId)
  }

  // Trie : courses proches de la date de l'activité d'abord (aide au choix).
  const sorted = activityDate
    ? [...races].sort((a, b) => Math.abs(+new Date(a.date) - +new Date(activityDate)) - Math.abs(+new Date(b.date) - +new Date(activityDate)))
    : races

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>{t('w3f.linked_race_label')}</div>
      {loading ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w3f.loading')}</div>
      ) : races.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w3f.no_races')}</div>
      ) : (
        <select value={sel} onChange={e => void save(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none' }}>
          <option value="">{t('w3f.no_linked_race')}</option>
          {sorted.map(r => (
            <option key={r.id} value={r.id}>{r.name} · {new Date(r.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</option>
          ))}
        </select>
      )}
      {/* Objectif multi-jours → choix du JOUR auquel rattacher cette activité. */}
      {(() => {
        const race = races.find(r => r.id === sel)
        if (!race?.end_date || race.end_date <= race.date) return null
        const days = daysBetween(race.date, race.end_date)
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>{t('w3f.linked_race_day')}</div>
            <select value={selDate || race.date} onChange={e => void save(sel, e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none' }}>
              {days.map(d => (
                <option key={d} value={d}>{new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</option>
              ))}
            </select>
          </div>
        )
      })()}
      {sel && siblings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: 8 }}>{t('w3f.race_chain')}</div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {siblings.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <a href={`/activities?id=${s.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 12, border: `1px solid ${s.id === activityId ? 'var(--primary)' : 'var(--border)'}`, background: s.id === activityId ? 'var(--primary-dim)' : 'var(--bg-card2)', minWidth: 150 }}>
                  <SportIcon sport={s.sport_type ?? 'run'} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{s.title || t('w3f.activity')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{[fmtKm(s.distance_m), fmtDur(s.moving_time_s)].filter(Boolean).join(' · ')}</div>
                  </div>
                </a>
                {i < siblings.length - 1 && (
                  <span aria-hidden style={{ color: 'var(--text-dim)', fontSize: 18, flexShrink: 0 }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {sel && siblings.length <= 1 && (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 0' }}>
          {t('w3f.link_more_hint')}
        </p>
      )}
    </div>
  )
}
