'use client'

// Saisie manuelle d'une mesure + objectif de poids. Les inputs sont les seuls
// éléments autorisés à porter une bordure (DESIGN_SYSTEM.md §3).

import { useI18n } from '@/lib/i18n'
import { M_INPUT, M_SHEET_CSS, MField, MButton } from '../mobile/ui'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

const inputStyle: React.CSSProperties = {
  width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-mid)',
  borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 'var(--space-1)',
}
const compactBtn: React.CSSProperties = {
  height: 38, padding: '0 18px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)',
  color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start',
}
const title: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }

interface Props {
  date: string; weight: string; mg: string; mm: string
  onDate: (v: string) => void; onWeight: (v: string) => void; onMg: (v: string) => void; onMm: (v: string) => void
  onSave: () => void
  goalInput: string; goalWeight: number | null
  onGoalInput: (v: string) => void; onSaveGoal: () => void; onGoToPlan: () => void
  /** Mobile (feuille MSheet) : champs doux remplis, libellés gris, pilules pleine largeur. */
  mobile?: boolean
  /** Mobile : masque le bouton « Enregistrer » de la mesure (porté par l'en-tête de la feuille). */
  hideSave?: boolean
}

export function MeasureForm(p: Props) {
  const { t } = useI18n()
  if (p.mobile) {
    const mfield = (label: string, value: string, on: (v: string) => void, type: string, unit?: string) => (
      <MField label={label} unit={unit}>
        <input className="ntm-in" type={type} inputMode={type === 'number' ? 'decimal' : undefined} step={type === 'number' ? '0.1' : undefined}
          value={value} onChange={e => on(e.target.value)}
          style={{ ...M_INPUT, ...(unit ? { paddingRight: 44, textAlign: 'right' } : null), ...(type === 'date' ? { WebkitAppearance: 'none', appearance: 'none' } : null) }} />
      </MField>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, fontFamily: FB }}>
        <style>{M_SHEET_CSS}</style>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: '0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('nutrition.measure.addTitle')}</h2>
          {mfield(t('nutrition.measure.date'), p.date, p.onDate, 'date')}
          {mfield(t('nutrition.measure.weightKg'), p.weight, p.onWeight, 'number')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {mfield(t('nutrition.measure.fatPct'), p.mg, p.onMg, 'number')}
            {mfield(t('nutrition.measure.muscleKg'), p.mm, p.onMm, 'number')}
          </div>
          {!p.hideSave && <MButton onClick={p.onSave}>{t('nutrition.common.save')}</MButton>}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: '0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('nutrition.measure.goalTitle')}</h2>
          {mfield(t('nutrition.measure.goalWeightKg'), p.goalInput, p.onGoalInput, 'number')}
          {p.goalWeight != null && (
            <p style={{ margin: '-4px 4px 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.45 }}>{t('nutrition.measure.goalNote')}</p>
          )}
          <MButton variant="soft" onClick={p.onSaveGoal}>{t('nutrition.measure.setBtn')}</MButton>
          <button type="button" onClick={p.onGoToPlan} style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 4px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>
            {t('nutrition.measure.linkedPlan')} →
          </button>
        </section>
      </div>
    )
  }
  const field = (label: string, value: string, on: (v: string) => void, type: string) => (
    <div style={{ minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} step={type === 'number' ? '0.1' : undefined} value={value} onChange={e => on(e.target.value)} style={inputStyle} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={title}>{t('nutrition.measure.addTitle')}</h2>
        <style>{`.measure-fields{grid-template-columns:1fr}@media(min-width:380px){.measure-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
        <div className="measure-fields" style={{ display: 'grid', gap: 'var(--space-4) var(--space-3)', marginBottom: 'var(--space-4)', maxWidth: '100%' }}>
          {field(t('nutrition.measure.date'), p.date, p.onDate, 'date')}
          {field(t('nutrition.measure.weightKg'), p.weight, p.onWeight, 'number')}
          {field(t('nutrition.measure.fatPct'), p.mg, p.onMg, 'number')}
          {field(t('nutrition.measure.muscleKg'), p.mm, p.onMm, 'number')}
        </div>
        <button onClick={p.onSave} style={compactBtn}>{t('nutrition.common.save')}</button>
      </div>

      <div>
        <h2 style={title}>{t('nutrition.measure.goalTitle')}</h2>
        <button onClick={p.onGoToPlan} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 'var(--space-3)', cursor: 'pointer',
          fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)', textAlign: 'left' }}>
          {t('nutrition.measure.linkedPlan')} →
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('nutrition.measure.goalWeightKg')}</label>
            <input type="number" step="0.1" value={p.goalInput} onChange={e => p.onGoalInput(e.target.value)} placeholder={t('nutrition.measure.goalPlaceholder')} style={inputStyle} />
          </div>
          <button onClick={p.onSaveGoal} style={{ ...compactBtn, alignSelf: 'auto' }}>{t('nutrition.measure.setBtn')}</button>
        </div>
        {p.goalWeight != null && (
          <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', margin: 'var(--space-2) 0 0' }}>
            {t('nutrition.measure.goalNote')}
          </p>
        )}
      </div>
    </div>
  )
}
