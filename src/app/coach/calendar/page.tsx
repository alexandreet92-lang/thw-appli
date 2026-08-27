'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// CALENDRIER COACH — les courses / objectifs datés de tous les athlètes,
// réunis et triés par date. Lecture seule.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { listMyAthletes } from '@/lib/coach/relationships'
import { getUpcomingRaces } from '@/lib/coach/athlete-data'

interface Item { id: string; athleteId: string; athlete: string; name: string; date: string; description: string | null }

const fmtDate = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) } catch { return d } }
const daysTo = (d: string) => Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400_000)

export default function CoachCalendar() {
  const { t } = useI18n()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const athletes = await listMyAthletes().catch(() => [])
      const all = await Promise.all(athletes.map(async a => {
        const races = await getUpcomingRaces(a.id).catch(() => [])
        const name = a.full_name || a.first_name || t('w2h.calendar.athleteFallback')
        return races.map(r => ({ id: r.id, athleteId: a.id, athlete: name, name: r.name || t('w2h.calendar.raceFallback'), date: r.start_date, description: r.description }))
      }))
      const flat = all.flat().sort((x, y) => x.date.localeCompare(y.date))
      if (!cancelled) { setItems(flat); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [t])

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{t('w2h.calendar.title')}</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>{t('w2h.calendar.subtitle')}</p>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>{t('w2h.common.loading')}</p>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>{t('w2h.calendar.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(it => {
            const d = daysTo(it.date)
            return (
              <Link key={it.id} href={`/coach/athlete/${it.athleteId}`} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit', padding: 14 }}>
                <div style={{ width: 58, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{d <= 0 ? t('w2h.calendar.dday') : t('w2h.calendar.dMinus', { d })}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{it.athlete} · {fmtDate(it.date)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
