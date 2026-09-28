'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PAGE ATHLÈTES — grille de cartes athlètes. Données RÉELLES via getRoster()
// (même source que /coach/athletes). Chaque carte est un lien vers la fiche
// dédiée /coach/athlete?id=<id>. États chargement / vide gérés. Zéro mock.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { getRoster, type RosterAthlete, type Forme } from '@/lib/coach/roster'

const STC: Record<Forme, string> = { ok: '#22C55E', warn: '#F59E0B', injured: '#EF4444', inactive: '#94A3B8' }
const initials = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

export default function AthletesPage() {
  const { t } = useI18n()
  const [roster, setRoster] = useState<RosterAthlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await getRoster()
        if (!cancelled) setRoster(r)
      } catch {
        /* on garde la liste précédente en cas d'erreur réseau */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">{t('misc.myAthletes')}</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">{t('misc.athletesSubtitle')}</p>
        </div>
        <Link href="/coach/athletes">
          <Button variant="primary">{t('misc.addAthlete')}</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-[13px] text-[var(--text-dim)]">{t('w1h.loading_roster')}</p>
      ) : roster.length === 0 ? (
        <p className="text-[14px] text-[var(--text-mid)] leading-relaxed max-w-[520px]">{t('w1h.empty_roster')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {roster.map((a) => (
            <Link
              key={a.id}
              href={`/coach/athlete?id=${a.id}`}
              className="block cursor-pointer"
            >
              <Card className="hover:border-brand transition-all">

                {/* Avatar + nom */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'w-11 h-11 rounded-[12px] flex items-center justify-center overflow-hidden',
                    'font-display text-[18px] font-bold flex-shrink-0'
                  )} style={{ background: 'var(--bg-alt)', color: 'var(--text-dim)' }}>
                    {a.avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.avatar} alt="" className="w-full h-full object-cover" />
                      : initials(a.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{a.name}</p>
                    <p className="text-[11px] text-[var(--text-dim)] truncate">{a.sports.slice(0, 2).join(', ') || '—'}{a.group ? ` · ${a.group}` : ''}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STC[a.status] }} />
                </div>

                {/* Charge 7 jours */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-mid)]">{t('w1h.col_load_7d')}</span>
                    <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{a.tss7}</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, a.tss7)}%`, background: STC[a.status] }} />
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-dim)]">
                  {a.race ? `${t('misc.next')} ${a.race.name}` : t('w1e.noRacePlanned')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
