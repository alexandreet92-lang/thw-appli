'use client'
// Vue LECTURE SEULE du protocole d'un test (le « procédé » vu dans la page
// Performance). Partagée par le Calendrier et le Planning pour afficher le
// déroulé exact d'un test avant de le planifier. Rend objectif, conditions,
// échauffement, étapes, erreurs fréquentes et fréquence conseillée.
import type { TestProtocol } from '@/lib/tests/protocols'
import { useI18n } from '@/lib/i18n'
import { useFormM, M_CARD, MDot } from '@/app/calendar/components/mobileForm'

const HEAD: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px', display: 'flex', alignItems: 'center', gap: 6 }

function Section({ label, color, items }: { label: string; color: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p style={{ ...HEAD, color }}>{label}</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-mid)' }}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

// Mobile (contexte FormM) : une carte blanche par section, titres 15 px en
// casse normale précédés d'un point de couleur — pas de surface teintée.
function MSec({ label, dot, items, text, danger }: { label: string; dot: string; items?: string[]; text?: string; danger?: boolean }) {
  if (items && !items.length) return null
  return (
    <div style={M_CARD}>
      <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--text)' }}>
        <MDot color={dot} />{label}
      </p>
      {text != null && <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)', margin: 0 }}>{text}</p>}
      {items && (
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => <li key={i} style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)' }}>{it}</li>)}
        </ul>
      )}
    </div>
  )
}

export default function TestProtocolView({ proto, accent = 'var(--primary)' }: { proto: TestProtocol; accent?: string }) {
  const { t } = useI18n()
  const m = useFormM()
  if (m) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MSec label={t('w4c.test_objective')} dot={accent} text={proto.objectif} />
      {proto.avertissement && <MSec label={t('w4c.test_warning')} dot="var(--danger)" text={proto.avertissement} danger />}
      <MSec label={t('w4c.test_conditions')} dot="var(--text-dim)" items={proto.conditions} />
      <MSec label={t('w4c.test_warmup')} dot="#f59e0b" items={proto.echauffement} />{/* design-allow-color — point « échauffement » (même teinte que le desktop) */}
      <MSec label={t('w4c.test_procedure')} dot={accent} items={proto.etapes} />
      <MSec label={t('w4c.test_common_errors')} dot="var(--danger)" items={proto.erreurs} />
      {proto.frequence && <MSec label={t('w4c.test_frequency')} dot="var(--text-dim)" text={proto.frequence} />}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
        <p style={{ ...HEAD, color: accent }}>{t('w4c.test_objective')}</p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', margin: 0 }}>{proto.objectif}</p>
      </div>
      {proto.avertissement && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
          <p style={{ ...HEAD, color: 'var(--danger)' }}>{t('w4c.test_warning')}</p>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)', margin: 0 }}>{proto.avertissement}</p>
        </div>
      )}
      <Section label={t('w4c.test_conditions')} color="var(--text)" items={proto.conditions} />
      <Section label={t('w4c.test_warmup')} color="#f59e0b" items={proto.echauffement} />
      <Section label={t('w4c.test_procedure')} color={accent} items={proto.etapes} />
      <Section label={t('w4c.test_common_errors')} color="#ef4444" items={proto.erreurs} />
      {proto.frequence && (
        <div>
          <p style={{ ...HEAD, color: 'var(--text-dim)' }}>{t('w4c.test_frequency')}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-mid)', margin: 0 }}>{proto.frequence}</p>
        </div>
      )}
    </div>
  )
}
