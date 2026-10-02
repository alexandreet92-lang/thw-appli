'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — écran d'accueil (conversation vide).
// « ✦ Hybrid » · salut + prénom · puces de contexte RÉELLES (forme TSB,
// séance du jour / de demain, prochaine course — chacune liée à sa page,
// masquée si aucune donnée) · grille 2×2 de suggestions branchées sur les
// actions rapides existantes · lien « Toutes les actions rapides ».
// ══════════════════════════════════════════════════════════════

import { Activity, Calendar, Flag, Heart, Leaf } from 'lucide-react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { formatDuration, iso } from '@/components/dashboard/lib'
import { sportLabel, sportLabelKey } from '@/components/recovery/helpers'
import { AimTile } from './SheetParts'
import { useAimWelcomeData, type AimLastActivity } from './useAimData'
import type { AimAgent, AimQuickAction } from './types'

interface Suggestion { key: string; tint: string; icon: React.ReactNode; title: string; sub: string }

function HybridMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="var(--primary)" />
    </svg>
  )
}

export function MobileWelcome({ agent, greeting, firstName, resolveAction, onRunAction, onOpenAllActions, onNavigate }: {
  agent: AimAgent
  greeting: string
  firstName: string
  resolveAction: (key: string) => AimQuickAction | undefined
  onRunAction: (key: string) => void
  onOpenAllActions: () => void
  onNavigate: (href: string) => void
}) {
  const { t } = useI18n()
  const isCoach = agent === 'coach'
  // Les données de contexte sont celles de l'utilisateur : inutiles (et
  // trompeuses) quand le coach travaille sur un athlète → non chargées.
  const data = useAimWelcomeData(!isCoach)

  const sportName = (s: string): string => {
    const k = sportLabelKey(s)
    return k === s ? sportLabel(s) : t(k)
  }
  const relDay = (startedAt: string): string => {
    const d = new Date(startedAt)
    const today = new Date()
    const y = new Date(today); y.setDate(today.getDate() - 1)
    if (iso(d) === iso(today)) return t('dashboard.today').toLowerCase()
    if (iso(d) === iso(y)) return t('shared.yesterday')
    return d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric' })
  }
  const lastSub = (a: AimLastActivity): string =>
    [sportName(a.sport), relDay(a.startedAt), a.seconds ? formatDuration(Math.round(a.seconds / 60)) : null]
      .filter(Boolean).join(' · ')

  const sub = (key: string): string => resolveAction(key)?.sub ?? ''
  const late = new Date().getHours() >= 15

  const coachSeeds: { key: string; tint: string; icon: React.ReactNode }[] = [
    { key: 'co_planifier_semaine', tint: 'plan', icon: <Calendar size={17} /> },
    { key: 'co_derniere_activite', tint: 'activity', icon: <Activity size={17} /> },
    { key: 'co_recup', tint: 'recovery', icon: <Heart size={17} /> },
    { key: 'co_plan_nutrition', tint: 'nutrition', icon: <Leaf size={17} /> },
  ]
  const suggestions: Suggestion[] = isCoach
    ? coachSeeds.flatMap(s => { const qa = resolveAction(s.key); return qa ? [{ ...s, title: qa.label, sub: qa.sub }] : [] })
    : [
        { key: 'training_plan', tint: 'plan', icon: <Calendar size={17} />, title: t('aim.sug.plan'), sub: t('aim.sug.planSub') },
        { key: 'analyze_training', tint: 'activity', icon: <Activity size={17} />, title: t('aim.sug.ride'), sub: data.last ? lastSub(data.last) : sub('analyze_training') },
        { key: 'reajuster_plan', tint: 'recovery', icon: <Heart size={17} />, title: t('aim.sug.week'), sub: data.form ? t('aim.ctx.formVerdict', { n: `${data.form.tsb > 0 ? '+' : ''}${data.form.tsb}`, verdict: data.form.label.toLowerCase() }) : sub('reajuster_plan') },
        { key: 'repas_post', tint: 'nutrition', icon: <Leaf size={17} />, title: late ? t('aim.sug.eatEvening') : t('aim.sug.eatDay'), sub: data.session ? `${data.session.when === 'today' ? t('dashboard.today') : t('aim.ctx.tomorrow')} : ${data.session.title}` : sub('repas_post') },
      ].filter(s => !!resolveAction(s.key))

  const chips: { key: string; href: string; icon: React.ReactNode; label: string }[] = []
  if (!isCoach && data.form) chips.push({
    key: 'form', href: '/recovery',
    icon: <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.form.color, flexShrink: 0 }} />,
    label: t('aim.ctx.form', { n: `${data.form.tsb > 0 ? '+' : ''}${data.form.tsb}` }),
  })
  if (!isCoach && data.session) chips.push({
    key: 'session', href: `/planning?week=${data.session.weekStart}`,
    icon: <Calendar size={14} style={{ flexShrink: 0 }} />,
    label: `${data.session.when === 'today' ? t('dashboard.today') : t('aim.ctx.tomorrow')} : ${data.session.title}`,
  })
  if (!isCoach && data.race) chips.push({
    key: 'race', href: `/calendar?race=${data.race.id}`,
    icon: <Flag size={14} style={{ flexShrink: 0 }} />,
    label: `${data.race.name} ${t('dashboard.daysCountdown', { n: data.race.days })}`,
  })

  return (
    <div className="aim-fade-up" style={{ paddingTop: 24, paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>
        <HybridMark />Hybrid
      </div>
      <h1 style={{
        margin: '10px 0 0', fontFamily: 'var(--font-body)', fontSize: 29, fontWeight: 800, lineHeight: 1.15,
        letterSpacing: '-0.02em', color: 'var(--text)',
      }}>
        {greeting}{firstName ? ` ${firstName}` : ''}.<br />{t('aim.welcome.question')}
      </h1>

      {chips.length > 0 && (
        <div className="aim-scroll-x" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '14px -18px 0', padding: '0 18px' }}>
          {chips.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => onNavigate(c.href)}
              className="aim-press"
              style={{ flexShrink: 0, minHeight: 44, padding: '4px 0', border: 'none', background: 'transparent', cursor: 'pointer', maxWidth: '82%' }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', maxWidth: '100%',
                borderRadius: 'var(--r-pill)', background: 'var(--surface-card)', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              }}>
                {c.icon}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: chips.length > 0 ? 14 : 22 }}>
          {suggestions.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => onRunAction(s.key)}
              className="aim-press"
              style={{
                minHeight: 92, padding: 14, borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
                background: 'var(--surface-card)', color: 'var(--text)', textAlign: 'left',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-body)',
              }}
            >
              <AimTile tint={s.tint}>{s.icon}</AimTile>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{s.title}</span>
              {s.sub && <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.3 }}>{s.sub}</span>}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={onOpenAllActions}
          style={{ minHeight: 44, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('aim.welcome.allActions')}
        </button>
      </div>
    </div>
  )
}
