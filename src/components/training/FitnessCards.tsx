'use client'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useI18n } from '@/lib/i18n'

interface FitnessCardsProps {
  ctl: number | null
  atl: number | null
  tsb: number | null
}

export function FitnessCards({ ctl, atl, tsb }: FitnessCardsProps) {
  const { t } = useI18n()
  const [sheet, setSheet] = useState<'CTL'|'ATL'|'TSB'|null>(null)
  const fmt = (v: number | null) => v != null ? v.toFixed(1) : '—'

  /* Valeur max approximative pour les barres de progression */
  const ctlPct  = Math.min(100, ((ctl  ?? 0) / 120) * 100)
  const atlPct  = Math.min(100, ((atl  ?? 0) / 150) * 100)
  const tsbPct  = Math.min(100, (((tsb ?? 0) + 100) / 200) * 100)

  const metrics = [
    {
      key: 'CTL' as const,
      value: fmt(ctl),
      pct: ctlPct,
      color: '#06B6D4',
      subtitle: t('shared.chronicLoad'),
      hint: t('shared.days42'),
    },
    {
      key: 'ATL' as const,
      value: fmt(atl),
      pct: atlPct,
      color: '#F97316',
      subtitle: t('shared.acuteLoad'),
      hint: t('shared.days7'),
    },
    {
      key: 'TSB' as const,
      value: fmt(tsb),
      pct: tsbPct,
      color: (tsb ?? 0) < 0 ? '#EF4444' : '#10B981',
      subtitle: t('shared.currentForm'),
      hint: 'CTL – ATL',
    },
  ]

  return (
    <>
      {/* Titre section */}
      <p style={{
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-label)',
        marginBottom: 12, paddingLeft: 16,
      }}>
        {t('shared.fitness')}
      </p>

      {/* Bande des 3 métriques */}
      <div style={{
        marginBottom: 20,
        border: '1px solid var(--info-border)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
      }}>
        {metrics.map((m, i) => (
          <div
            key={m.key}
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRight: i < 2
                ? '1px solid var(--info-border)'
                : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              /* fond transparent = même que la page */
              backgroundColor: 'transparent',
            }}
          >
            {/* Label + bouton ? */}
            <div style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-label)',
              }}>
                {m.key}
              </span>
              <button
                type="button"
                onClick={() => setSheet(m.key)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0,
                  color: 'var(--text-label)',
                  fontSize: 13, lineHeight: 1,
                }}
              >
                ?
              </button>
            </div>

            {/* Valeur grande et colorée */}
            <span style={{
              fontSize: 34, fontWeight: 800,
              color: m.color, lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              {m.value}
            </span>

            {/* Sous-titre : nom de l'indicateur */}
            <span style={{
              fontSize: 11, color: 'var(--text-muted)',
              lineHeight: 1.3,
            }}>
              {m.subtitle}
            </span>

            {/* Barre de progression colorée */}
            <div style={{
              height: 3, borderRadius: 2,
              backgroundColor: 'var(--info-border)',
              marginTop: 4,
            }}>
              <div style={{
                width: `${m.pct}%`,
                height: '100%',
                borderRadius: 2,
                backgroundColor: m.color,
                transition: 'width 600ms ease',
              }} />
            </div>

            {/* Hint : période de calcul */}
            <span style={{ fontSize: 10, color: 'var(--text-label)' }}>
              {m.hint}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom sheets inchangés */}
      {(['CTL','ATL','TSB'] as const).map(k => (
        <BottomSheet key={k} isOpen={sheet===k}
                     onClose={() => setSheet(null)}
                     title={
                       k==='CTL' ? t('shared.ctlSheetTitle') :
                       k==='ATL' ? t('shared.atlSheetTitle') :
                                   t('shared.tsbSheetTitle')
                     }>
          <p style={{ fontSize:14, lineHeight:1.7,
                      color:'var(--text-body)' }}>
            {k==='CTL' && t('shared.ctlSheetBody')}
            {k==='ATL' && t('shared.atlSheetBody')}
            {k==='TSB' && t('shared.tsbSheetBody')}
          </p>
        </BottomSheet>
      ))}
    </>
  )
}
