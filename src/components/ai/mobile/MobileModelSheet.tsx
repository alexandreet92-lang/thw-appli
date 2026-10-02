'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — feuille « Modèle ».
// Hermès / Athéna / Zeus (point couleur, description, coût relatif réel
// = multiplicateur de tokens, ✓ sur le modèle actif) + carte « Crédits IA »
// (jauges réelles /api/tokens/limits, réinitialisation, recharge, offre).
// Verrou conservé : pendant une génération, le choix est bloqué.
// ══════════════════════════════════════════════════════════════

import { Check, Lock } from 'lucide-react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { MobileSheet } from '../MobileSheet'
import { MODEL_BADGE } from '@/lib/quick-actions/models'
import { getModelMultiplier } from '@/lib/tokens/multipliers'
import { Skeleton } from '@/components/shadcn/skeleton'
import { AimGroupLabel, AimSep, AimSheetHeader } from './SheetParts'
import { aimModelName } from './MobileTopBar'
import { limitPct, type AimModel, type AimTokenLimits } from './types'

const MODELS: AimModel[] = ['hermes', 'athena', 'zeus']

function gaugeColor(p: number): string {
  if (p > 95) return 'var(--danger)'
  if (p > 85) return 'var(--charge-mid)'
  return 'var(--primary)'
}
function untilDays(isoDate: string): string {
  const d = Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000))
  return `${d} j`
}
function untilHours(isoDate: string): string {
  const h = Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 3_600_000))
  return `${h} h`
}

export function AimGauge({ pct, height = 10 }: { pct: number; height?: number }) {
  return (
    <div style={{ height, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)', overflow: 'hidden' }}>
      <div className="aim-gauge-fill" style={{ height: '100%', width: `${pct}%`, background: gaugeColor(pct), borderRadius: 'var(--r-pill)' }} />
    </div>
  )
}

export function MobileModelSheet({ model, locked, descKey, hintKey, limits, onSelect, onClose, onBuyTokens, onUpgrade }: {
  model: AimModel
  locked: boolean
  descKey: (m: AimModel) => string
  hintKey: (m: AimModel) => string
  limits: AimTokenLimits | null
  onSelect: (m: AimModel) => void
  onClose: () => void
  onBuyTokens: () => void
  onUpgrade: () => void
}) {
  const { t } = useI18n()
  const monthPct = limits ? Math.round(limitPct(limits.monthly.used, limits.monthly.limit)) : 0
  const sixPct = limits ? Math.round(limitPct(limits.rolling_6h.used, limits.rolling_6h.limit)) : 0
  const canUpgrade = !!limits && limits.plan !== 'expert'

  return (
    <MobileSheet
      onClose={onClose}
      surface="var(--surface-card)"
      renderHeader={close => <AimSheetHeader title={t('aip.model.label')} onClose={close} />}
    >
      <div style={{ padding: '0 8px 12px' }}>
        {locked && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 6px 10px', fontSize: 13, color: 'var(--text-mid)' }}>
            <Lock size={14} /> {t('aip.model.locked')}
          </p>
        )}
        <div className="aim-group" role="radiogroup" aria-label={t('aip.model.aiModel')}>
          {MODELS.map((m, i) => {
            const on = m === model
            return (
              <div key={m}>
                {i > 0 && <AimSep flush />}
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => { onSelect(m); onClose() }}
                  className="aim-row"
                  style={{ minHeight: 64, padding: '14px 14px', opacity: locked && !on ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: MODEL_BADGE[m].color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {aimModelName(m)}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}> · {t(descKey(m))}</span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{t(hintKey(m))}</span>
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>× {getModelMultiplier(m)}</span>
                  <span style={{ width: 22, display: 'flex', justifyContent: 'flex-end', color: 'var(--primary)', flexShrink: 0 }}>
                    {on && <Check size={20} strokeWidth={2.6} />}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <AimGroupLabel>{t('aim.credits.title')}</AimGroupLabel>
        <div className="aim-group" style={{ padding: 16 }}>
          {!limits ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton style={{ height: 30, width: '50%' }} />
              <Skeleton style={{ height: 10 }} />
              <Skeleton style={{ height: 14, width: '70%' }} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }}>
                  {monthPct} %<span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)' }}> {t('aim.credits.used')}</span>
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{t('ai.resetsIn', { d: untilDays(limits.monthly.resets_at) })}</span>
              </div>
              <div style={{ margin: '12px 0 14px' }}><AimGauge pct={monthPct} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-mid)', marginBottom: 6 }}>
                <span>{t('ai.sixHourLimit')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{sixPct} % · {t('ai.resetsIn', { d: untilHours(limits.rolling_6h.resets_at) })}</span>
              </div>
              <AimGauge pct={sixPct} height={6} />
              {limits.bonus_tokens > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--text-mid)' }}>
                  <span>{t('ai.bonusTokens')}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{limits.bonus_tokens.toLocaleString(currentLocale())}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => { onClose(); onBuyTokens() }}
                  style={{ minHeight: 44, padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {t('ai.buyTokens')}
                </button>
                {canUpgrade && (
                  <button type="button" onClick={() => { onClose(); onUpgrade() }}
                    style={{ minHeight: 44, padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t('aim.credits.upgrade')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MobileSheet>
  )
}
