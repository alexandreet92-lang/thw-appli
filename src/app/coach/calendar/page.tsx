'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// CALENDRIER COACH — les courses / objectifs datés de tous les athlètes,
// réunis et triés par date. Lecture seule.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n, currentLocale } from '@/lib/i18n'
import { listMyAthletes } from '@/lib/coach/relationships'
import { getUpcomingRaces } from '@/lib/coach/athlete-data'
import { useIsMobile } from '@/components/ai/mobile/MobileKit'
import { MPage, MTitle, Rise, GroupM, Label, MAvatar, SkelRows, EmptyM, Ico, ICON, NUM, CCard } from '@/components/coach/mobile/CoachKit'

interface Item { id: string; athleteId: string; athlete: string; name: string; date: string; description: string | null }

const fmtDate = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) } catch { return d } }
const daysTo = (d: string) => Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400_000)

export default function CoachCalendar() {
  const { t } = useI18n()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

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

  // Mobile (≤ 767 px) : échéances groupées par mois, lignes J-x façon maquette.
  if (isMobile) {
    const byMonth = new Map<string, Item[]>()
    for (const it of items) { const k = it.date.slice(0, 7); byMonth.set(k, [...(byMonth.get(k) ?? []), it]) }
    const monthLabel = (k: string) => { try { return new Date(k + '-01T00:00:00').toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' }) } catch { return k } }
    return (
      <MPage>
        <MTitle title={t('w2h.calendar.title')} sub={t('w2h.calendar.subtitle')} />
        {loading ? <CCard><SkelRows n={4} /></CCard> : items.length === 0 ? (
          <Rise i={1}><CCard><EmptyM icon={<Ico d={ICON.flag} size={26} />} title={t('w2h.calendar.empty')} /></CCard></Rise>
        ) : [...byMonth.entries()].map(([k, list], gi) => (
          <Rise key={k} i={gi + 1}>
            <Label><span style={{ textTransform: 'capitalize' }}>{monthLabel(k)}</span></Label>
            <GroupM>
              {list.map((it, i) => {
                const d = daysTo(it.date)
                return (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <Link href={`/calendar?race=${it.id}`} className="cm-press" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ ...NUM, width: 66, flexShrink: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{d <= 0 ? t('w2h.calendar.dday') : t('w2h.calendar.dMinus', { d })}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                        <span style={{ display: 'block', fontSize: 15, color: 'var(--text-mid)', marginTop: 3, textTransform: 'capitalize' }}>{d <= 14 && <span aria-hidden style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', marginRight: 6, verticalAlign: 'middle' }} />}{fmtDate(it.date)}</span>
                      </span>
                    </Link>
                    {/* Athlète → fiche (lien distinct) */}
                    <Link href={`/coach/athlete?id=${it.athleteId}`} className="cm-press" aria-label={it.athlete} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-chip)', borderRadius: 'var(--r-pill)', padding: '4px 10px 4px 4px', maxWidth: 120 }}>
                      <MAvatar name={it.athlete} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.athlete.split(' ')[0]}</span>
                    </Link>
                  </div>
                )
              })}
            </GroupM>
          </Rise>
        ))}
      </MPage>
    )
  }

  const card: React.CSSProperties = { borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }

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
              <div key={it.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
                {/* Bloc course (date + nom) → page de la course */}
                <Link href={`/calendar?race=${it.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <div style={{ width: 58, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{d <= 0 ? t('w2h.calendar.dday') : t('w2h.calendar.dMinus', { d })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{fmtDate(it.date)}</div>
                  </div>
                </Link>
                {/* Nom athlète → fiche athlète (lien distinct, pas imbriqué) */}
                <Link href={`/coach/athlete?id=${it.athleteId}`} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>{it.athlete}</Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
