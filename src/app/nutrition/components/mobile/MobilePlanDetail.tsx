'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition mobile — détail « Mon plan ». Une carte par sujet : plan actif
// (cible du jour), cibles par type de jour, 14 prochains jours (barres
// colorées par type, chaque jour ouvre sa fiche), liste (courses, repas types),
// puis les actions. Tous les boutons appellent les MÊMES handlers que
// l'onglet bureau PlanTab (passés par page.tsx). Données réelles uniquement.
// ══════════════════════════════════════════════════════════════

import { useI18n, currentLocale } from '@/lib/i18n'
import type { NutritionPlan, PlanDay } from '@/hooks/useNutrition'
import type { PlannedSession } from '@/hooks/usePlanning'
import { usePushNav } from '@/hooks/usePushNav'
import { CHARGE_COLOR, type DayType } from '../plan/planFormat'
import { Card, Head, ListCard, ListRow, PrimaryPill, Dot, IC, NUM, fmtInt, dayLabel } from './ui'

interface Macro { proteines: number; glucides: number; lipides: number }

export interface MobilePlanDetailProps {
  activePlan: NutritionPlan | null
  today: string
  realToday: string
  todayType: DayType
  todayKcalObj: number
  todayMacroObj: Macro
  todaySessions: PlannedSession[]
  next14Days: string[]
  templatesCount: number
  onOpenDay: (d: PlanDay) => void
  onOpenAI: () => void
  onOpenShopping: () => void
  onOpenTemplates: () => void
  onRegen: () => void
  onDelete: () => void
}

const TYPES: DayType[] = ['low', 'mid', 'hard']
const textBtn: React.CSSProperties = {
  minHeight: 44, padding: '0 6px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
}

export function MobilePlanDetail(p: MobilePlanDetailProps) {
  const { t } = useI18n()
  const push = usePushNav()
  const plan = p.activePlan

  if (!plan) {
    return <>
      <Card>
        <Head icon={IC.plan} title={t('nutrition.m.myPlan')} />
        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('nutrition.plan.emptyTitle')}</p>
        <p style={{ margin: '6px 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutrition.plan.emptyDesc')}</p>
        <PrimaryPill onClick={p.onOpenAI}>{t('nutrition.m.createPlan')}</PrimaryPill>
      </Card>
      <ListCard>
        <ListRow first title={t('nutrition.templates.title')} sub={t('nutm.templatesCount', { n: p.templatesCount })} onClick={p.onOpenTemplates} />
      </ListCard>
    </>
  }

  const d = plan.plan_data
  const source = plan.type === 'manuel' ? t('nutm.sourceCoach') : t('nutm.sourceAi')
  const sessTitles = p.todaySessions.map(s => s.title).filter(Boolean).join(' · ')
  const m = p.todayMacroObj

  // 14 prochains jours : kcal cible + type (jour du plan, sinon type calculé pour aujourd'hui).
  const days = p.next14Days.map(date => {
    const pd = d.jours?.find(j => j.date === date) ?? null
    const type: DayType | null = pd?.type_jour ?? (date === p.today ? p.todayType : null)
    const kcal = pd?.kcal ?? (type ? d[`calories_${type}`] ?? 0 : 0)
    return { date, pd, type, kcal, isToday: date === p.today }
  })
  const maxK = Math.max(1, ...days.map(x => x.kcal))
  const W = 320, H = 90, GAP = 4
  const bw = (W - GAP * (days.length - 1)) / Math.max(1, days.length)

  return <>
    {/* Plan actif — cible du jour */}
    <Card>
      <Head icon={IC.plan} title={t('nutrition.m.myPlan')} meta={source} />
      <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--text-mid)' }}>
        {p.today === p.realToday ? t('dashboard.today') : new Date(p.today + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'short' })} · {t(`nutrition.m.type.${p.todayType}`)}
      </p>
      <span style={{ ...NUM, display: 'block', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {p.todayKcalObj > 0 ? fmtInt(p.todayKcalObj) : '—'}<span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4 }}>kcal</span>
      </span>
      <p style={{ ...NUM, margin: '8px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>P {fmtInt(m.proteines)} g · G {fmtInt(m.glucides)} g · L {fmtInt(m.lipides)} g</p>
      {sessTitles ? (
        <button type="button" onClick={() => push('/planning')}
          style={{ display: 'block', marginTop: 10, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
          {t('nutrition.hero.tunedOn', { titles: sessTitles })} →
        </button>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--text-dim)' }}>{t('nutrition.hero.restDay')}</p>
      )}
    </Card>

    {/* Cibles par type de jour */}
    <Card>
      <Head title={t('nutrition.plan.targetsByDay')} small />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {TYPES.map(ty => {
          const mac = d[`macros_${ty}`]
          const kc = d[`calories_${ty}`]
          return (
            <div key={ty} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                <Dot color={CHARGE_COLOR[ty]} />{t(`nutrition.m.typeShort.${ty}`)}
              </div>
              <div style={{ ...NUM, marginTop: 2, fontSize: 24, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{kc ? fmtInt(kc) : '—'}</div>
              <div style={{ ...NUM, fontSize: 12, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mac ? `P ${fmtInt(mac.proteines)} · G ${fmtInt(mac.glucides)}` : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </Card>

    {/* 14 prochains jours — barres colorées par type ; aujourd'hui en accent. */}
    <Card>
      <Head title={t('nutm.next14')} small />
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={t('nutm.next14')}>
        {days.map((x, i) => {
          const h = x.kcal > 0 ? Math.max(6, (x.kcal / maxK) * H) : 4
          const fill = x.isToday ? 'var(--primary)' : x.type && x.kcal > 0 ? CHARGE_COLOR[x.type] : 'var(--bg-hover)'
          const open = x.pd ? () => p.onOpenDay(x.pd as PlanDay) : undefined
          return (
            <g key={x.date} onClick={open} style={{ cursor: open ? 'pointer' : 'default' }}>
              <title>{`${dayLabel(x.date)}${x.kcal > 0 ? ` · ${fmtInt(x.kcal)} kcal` : ''}`}</title>
              <rect x={i * (bw + GAP)} y={0} width={bw} height={H} fill="transparent" />
              <rect x={i * (bw + GAP)} y={H - h} width={bw} height={h} rx={3} fill={fill} />
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        <span>{dayLabel(days[0].date)}</span>
        {days.length > 7 && <span>{dayLabel(days[7].date)}</span>}
        <span>{dayLabel(days[days.length - 1].date)}</span>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutm.tapDayPlan')}</p>
    </Card>

    {/* Outils du plan */}
    <ListCard>
      <ListRow first title={t('nutrition.plan.shoppingList')} sub={t('nutm.shoppingSub')} onClick={p.onOpenShopping} />
      <ListRow title={t('nutrition.templates.title')} sub={t('nutm.templatesCount', { n: p.templatesCount })} onClick={p.onOpenTemplates} />
    </ListCard>

    <PrimaryPill onClick={p.onOpenAI}>{t('nutrition.plan.editAI')}</PrimaryPill>
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '-4px 0 0' }}>
      <button type="button" onClick={p.onRegen} style={{ ...textBtn, color: 'var(--text-mid)' }}>{t('nutrition.regen.confirm')}</button>
      <button type="button" onClick={p.onDelete} style={{ ...textBtn, color: 'var(--danger)' }}>{t('nutm.deletePlan')}</button>
    </div>
  </>
}
