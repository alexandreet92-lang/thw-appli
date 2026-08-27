'use client'
// ══════════════════════════════════════════════════════════════════
// CoachTargetsPanel — vue COACH de la nutrition d'un athlète. Le coach
// définit des CIBLES hebdomadaires (kcal/jour + protéines/jour, déclinées par
// type de jour repos/modéré/dur) et les enregistre comme plan actif de
// l'athlète. Le coach ne PEUT PAS enregistrer de repas (la RLS le bloque déjà :
// nutrition_meal_logs n'accorde au coach qu'une lecture) — on n'affiche donc
// aucune UI de logging côté coach, seulement les objectifs.
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import type { NutritionPlanData } from '@/hooks/useNutrition'
import { useI18n } from '@/lib/i18n'

const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, outline: 'none', fontVariantNumeric: 'tabular-nums' }

// Décline les cibles « repos » en modéré / dur (+kcal, +protéines les jours durs).
function buildPlanData(kcal: number, prot: number, existing: NutritionPlanData | null): NutritionPlanData {
  const gluc = Math.max(0, Math.round((kcal - prot * 4 - (kcal * 0.30)) / 4)) // ~30% lipides
  const lip = Math.max(0, Math.round((kcal * 0.30) / 9))
  const macroLow = { proteines: prot, glucides: gluc, lipides: lip }
  const macroMid = { proteines: Math.round(prot * 1.05), glucides: Math.round(gluc * 1.15), lipides: lip }
  const macroHard = { proteines: Math.round(prot * 1.1), glucides: Math.round(gluc * 1.35), lipides: lip }
  return {
    description: existing?.description || 'Objectifs définis par le coach',
    calories_low: kcal,
    calories_mid: Math.round(kcal * 1.12),
    calories_hard: Math.round(kcal * 1.28),
    macros_low: macroLow, macros_mid: macroMid, macros_hard: macroHard,
    jours: existing?.jours ?? [],
  }
}

export default function CoachTargetsPanel({ athleteName, activePlan, onSave }: {
  athleteName: string
  activePlan: { plan_data?: NutritionPlanData | null } | null
  onSave: (plan: NutritionPlanData, type: 'manuel') => Promise<void>
}) {
  const { t } = useI18n()
  const pd = activePlan?.plan_data ?? null
  const [kcal, setKcal] = useState<string>(pd?.calories_low ? String(pd.calories_low) : '')
  const [prot, setProt] = useState<string>(pd?.macros_low?.proteines ? String(pd.macros_low.proteines) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    const k = parseInt(kcal) || 0, p = parseInt(prot) || 0
    if (k <= 0 || p <= 0) return
    setSaving(true); setSaved(false)
    try { await onSave(buildPlanData(k, p, pd), 'manuel'); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 18px 20px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 4px' }}>{t('w2b.targetsTitle', { athleteName })}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>
          {t('w2b.targetsIntro')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><p style={LBL}>{t('w2b.caloriesPerDay')}</p><input type="number" inputMode="numeric" style={INP} value={kcal} onChange={e => setKcal(e.target.value)} placeholder="2200" /></div>
          <div><p style={LBL}>{t('w2b.proteinPerDay')}</p><input type="number" inputMode="numeric" style={INP} value={prot} onChange={e => setProt(e.target.value)} placeholder="140" /></div>
        </div>
        {(parseInt(kcal) > 0 && parseInt(prot) > 0) && (
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            <Chip label={t('w2b.dayRest')} kcal={parseInt(kcal)} />
            <Chip label={t('w2b.dayModerate')} kcal={Math.round(parseInt(kcal) * 1.12)} />
            <Chip label={t('w2b.dayHard')} kcal={Math.round(parseInt(kcal) * 1.28)} />
          </div>
        )}
        <button onClick={() => void save()} disabled={saving || !(parseInt(kcal) > 0 && parseInt(prot) > 0)}
          style={{ marginTop: 16, width: '100%', padding: 12, borderRadius: 12, border: 'none', background: saved ? '#22c55e' : 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: !(parseInt(kcal) > 0 && parseInt(prot) > 0) ? 0.5 : 1 }}>
          {saving ? '…' : saved ? t('w2b.targetsSaved') : t('w2b.setWeekTargets')}
        </button>
      </div>

      <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        {t('w2b.coachNotePart1')}<strong>{t('w2b.coachNoteStrong')}</strong>{t('w2b.coachNotePart2')}
      </div>
    </div>
  )
}

function Chip({ label, kcal }: { label: string; kcal: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{kcal} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>kcal</span></span>
    </div>
  )
}
