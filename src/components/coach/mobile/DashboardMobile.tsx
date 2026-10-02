'use client'
// ══════════════════════════════════════════════════════════════════
// DASHBOARD COACH — version MOBILE (maquette k1) : salutation, tuiles KPI
// à compteur animé, « À suivre en priorité » (tags de statut), prochaines
// échéances J-x, charge de l'équipe (barres qui poussent), invitations,
// accès rapides en liste groupée (Training, Calendrier, Bibliothèque,
// Studio, Vitrine, Abonnement…). Données = celles de la page (getRoster).
// ══════════════════════════════════════════════════════════════════
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n, currentLocale } from '@/lib/i18n'
import { useProfile } from '@/hooks/useProfile'
import type { RosterAthlete, Forme } from '@/lib/coach/roster'
import {
  MPage, MTitle, Rise, CCard, CardHead, KpiTile, MAvatar, Tag, RowLink, RowText, GrowBars, CountUp, SkelRows, EmptyM, MiniPill,
  IconTile, Ico, ICON, TILE, NUM, STATUS_COLOR, Chevron, useTT,
} from './CoachKit'

const ORDER: Record<Forme, number> = { injured: 0, inactive: 1, warn: 2, ok: 3 }

export default function DashboardMobile({ roster, pending, loading }: { roster: RosterAthlete[]; pending: number; loading: boolean }) {
  const router = useRouter()
  const { t } = useI18n()
  const tt = useTT()
  const { profile } = useProfile()

  const total = roster.length
  const active = roster.filter(a => a.lastDays <= 7).length
  const alert = roster.filter(a => a.status !== 'ok').length
  const unread = roster.reduce((s, a) => s + a.unread, 0)
  const tssRoster = Math.round(roster.reduce((s, a) => s + a.tss7, 0))
  const priority = useMemo(() => [...roster].filter(a => a.status !== 'ok').sort((x, y) => ORDER[x.status] - ORDER[y.status]), [roster])
  const races = useMemo(() => roster.filter(a => a.race).map(a => ({ a, race: a.race! })).sort((x, y) => x.race.days - y.race.days).slice(0, 6), [roster])
  // Charge de l'équipe : somme des TSS par jour sur 7 jours (dernier = aujourd'hui).
  const daily = useMemo(() => { const d = [0, 0, 0, 0, 0, 0, 0]; roster.forEach(a => a.load7.forEach((v, i) => { d[i] += v || 0 })); return d }, [roster])
  const dayLabels = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    try { return d.toLocaleDateString(currentLocale(), { weekday: 'narrow' }).toUpperCase() } catch { return '' }
  }), [])

  const first = (profile?.full_name || '').trim().split(/\s+/)[0] || ''
  const hour = new Date().getHours()
  const hello = hour >= 18 ? tt('co.dash_evening', 'Bonsoir') : tt('co.dash_hello', 'Bonjour')
  let today = ''
  try { today = new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) } catch { /* */ }

  const QUICK: { href: string; label: string; sub: string; color: string; icon: React.ReactNode }[] = [
    { href: '/coach/training', label: tt('co.nav_training', 'Training'), sub: tt('co.nav_training_sub', 'Séances réalisées par tes athlètes'), color: TILE.orange, icon: <Ico d={ICON.activity} size={20} /> },
    { href: '/coach/calendar', label: tt('co.nav_calendar', 'Calendrier'), sub: tt('co.nav_calendar_sub', 'Courses et objectifs du roster'), color: TILE.red, icon: <Ico d={ICON.flag} size={20} /> },
    { href: '/coach/library', label: t('w3d.nav_library'), sub: tt('co.nav_library_sub', 'Tes séances types, synchronisées'), color: TILE.blue, icon: <Ico d={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>} size={20} /> },
    { href: '/coach/studio', label: t('w3d.nav_studio'), sub: tt('co.nav_studio_sub', 'Lance un système sur tes athlètes'), color: TILE.violet, icon: <Ico d={<><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7 6.6 10.6 16.4M17 6.6 13.4 16.4" /></>} size={20} /> },
    { href: '/coach/vitrine', label: tt('co.nav_vitrine', 'Ma vitrine'), sub: tt('co.nav_vitrine_sub', 'Ta page publique de coach'), color: TILE.cyan, icon: <Ico d={ICON.star} size={20} /> },
    { href: '/coach/subscription', label: tt('co.nav_subscription', 'Abonnement coach'), sub: tt('co.nav_subscription_sub', 'Pack, capacité et facturation'), color: TILE.green, icon: <Ico d={ICON.card} size={20} /> },
    // Plus de sidebar coach sur mobile : la Communauté (ex-entrée de la sidebar) reste accessible ici.
    { href: '/community', label: t('nav.community'), sub: tt('co.nav_community_sub', 'Salons, groupes et événements'), color: TILE.indigo, icon: <Ico d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} size={20} /> },
  ]

  return (
    <MPage>
      <MTitle title={first ? `${hello} ${first}` : hello} sub={<span style={{ textTransform: 'capitalize' }}>{today}</span>} />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <KpiTile i={0} label={tt('co.kpi_athletes', 'Athlètes')} value={loading ? null : total} onClick={() => router.push('/coach/athletes')} />
        <KpiTile i={1} label={tt('co.kpi_active', 'Actifs 7 j')} value={loading ? null : active} onClick={() => router.push('/coach/athletes')} />
        <KpiTile i={2} label={tt('co.kpi_alert', 'En alerte')} value={loading ? null : alert} tone={alert > 0 ? 'var(--danger)' : undefined} onClick={() => router.push('/coach/athletes')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
        <KpiTile i={3} label={tt('co.kpi_unread', 'Messages non lus')} value={loading ? null : unread} tone={unread > 0 ? 'var(--primary)' : undefined} onClick={() => router.push('/coach/messages')} />
        <KpiTile i={4} label={tt('co.kpi_load', 'Charge 7 j')} value={loading ? null : tssRoster} suffix="TSS" />
      </div>

      {/* À suivre en priorité */}
      <Rise i={5} style={{ marginTop: 14 }}>
        <div data-guide="coach-priority">
          <CCard>
            <CardHead title={t('w3d.priority_title')} count={loading ? undefined : priority.length} />
            {loading ? <SkelRows n={3} /> : priority.length === 0 ? (
              <EmptyM icon={<Ico d={<path d="M20 6 9 17l-5-5" />} size={26} sw={2.4} />} title={t('w3d.priority_empty')} />
            ) : priority.map((a, i) => (
              <RowLink key={a.id} first={i === 0} href={`/coach/athlete?id=${a.id}`}>
                <MAvatar name={a.name} url={a.avatar} status={a.status} />
                <RowText title={a.name} sub={a.insight?.headline || a.reason || t(`w3d.forme_${a.status}`)} />
                <Tag color={STATUS_COLOR[a.status]}>{t(`w3d.forme_${a.status}`)}</Tag>
              </RowLink>
            ))}
          </CCard>
        </div>
      </Rise>

      {/* Prochaines échéances */}
      <Rise i={6} style={{ marginTop: 14 }}>
        <CCard>
          <CardHead title={t('w3d.upcoming_title')} right={tt('co.nav_calendar', 'Calendrier')} onRight={() => router.push('/coach/calendar')} />
          {loading ? <SkelRows n={2} /> : races.length === 0 ? (
            <EmptyM icon={<Ico d={ICON.flag} size={24} />} title={t('w3d.upcoming_empty')} />
          ) : races.map(({ a, race }, i) => (
            <RowLink key={a.id + race.name} first={i === 0} href={`/coach/athlete?id=${a.id}&tab=goals`}>
              <span style={{ ...NUM, width: 64, flexShrink: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('w3d.days_until', { days: race.days })}
              </span>
              <RowText title={race.name} sub={<>{race.days <= 14 && <span aria-hidden style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', marginRight: 6, verticalAlign: 'middle' }} />}{a.name}</>} />
            </RowLink>
          ))}
        </CCard>
      </Rise>

      {/* Charge de l'équipe */}
      <Rise i={7} style={{ marginTop: 14 }}>
        <CCard>
          <CardHead title={tt('co.team_load', 'Charge de l’équipe')} right={tt('co.days_7', '7 jours')} />
          <div style={{ ...NUM, margin: '14px 0 16px', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text)' }}>
            {loading ? <span style={{ color: 'var(--text-dim)' }}>—</span> : <CountUp value={tssRoster} />}
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-mid)', marginLeft: 8, letterSpacing: 0 }}>TSS</span>
          </div>
          <GrowBars values={daily} highlight={6} height={96} labels={dayLabels} />
        </CCard>
      </Rise>

      {/* Invitations en attente */}
      {pending > 0 && (
        <Rise i={8} style={{ marginTop: 14 }}>
          <CCard style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ ...NUM, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}><CountUp value={pending} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', lineHeight: 1.35 }}>{pending > 1 ? t('w3d.pending_invites_plural') : t('w3d.pending_invites_singular')}</span>
            <MiniPill onClick={() => router.push('/coach/athletes?invite=1')}>{t('w3d.manage')}</MiniPill>
          </CCard>
        </Rise>
      )}

      {/* Accès rapides */}
      <Rise i={9} style={{ marginTop: 14 }}>
        <div data-guide="coach-tiles">
          <CCard pad={0} style={{ padding: '0 16px' }}>
            {QUICK.map((q, i) => (
              <RowLink key={q.href} first={i === 0} href={q.href}>
                <IconTile color={q.color} size={42}>{q.icon}</IconTile>
                <RowText title={q.label} sub={q.sub} />
                <Chevron />
              </RowLink>
            ))}
          </CCard>
        </div>
      </Rise>
    </MPage>
  )
}
