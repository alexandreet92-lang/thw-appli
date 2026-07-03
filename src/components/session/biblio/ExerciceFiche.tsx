'use client'
// Vue détail d'une FAMILLE : fiche/brique + modes & prescription + variantes.
// `a-encadrer` = avertissement (jamais blocage). `deriveRecommande` = proposition.
import { IconArrowLeft, IconAlertTriangle, IconShieldCheck } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import {
  PRESCRIPTIONS, MODE_LABEL, GROUPE_LABEL, EQUIP_LABEL, MUSCLE_LABEL, FLAG_LABEL,
  primaryMode, varianteEffective, nomDerive, type FamilleExercice, type Variante,
} from '@/data/exercices'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 'var(--r-sm)', fontFamily: FB, fontSize: 11, fontWeight: 500,
      background: accent ? 'var(--primary-dim)' : 'var(--bg-card2)', color: accent ? 'var(--primary)' : 'var(--text-mid)' }}>
      {children}
    </span>
  )
}

function AEncadrerBanner() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-4)',
      borderRadius: 'var(--r-md)', background: 'var(--zone-bad-bg)', marginTop: 'var(--space-4)' }}>
      <IconAlertTriangle size={17} style={{ color: 'var(--zone-bad-border)', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: 0 }}>{t('session.aEncadrerMsg')}</p>
    </div>
  )
}

function Liste({ titre, items }: { titre: string; items: string[] }) {
  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>{titre}</h4>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: 'var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0, marginTop: 7 }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VarianteRow({ famille, v }: { famille: FamilleExercice; v: Variante }) {
  const { t } = useI18n()
  const eff = varianteEffective(famille, v)
  const aEnc = eff.flags.includes('a-encadrer')
  const derive = v.deriveRecommande ? nomDerive(famille, v.deriveRecommande) : undefined
  return (
    <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{v.nom}</span>
        <Tag>{t('session.diffSlash', { n: v.difficulteTechnique })}</Tag>
        {eff.flags.filter(fl => fl !== 'combo').map(fl => <Tag key={fl}>{FLAG_LABEL[fl]}</Tag>)}
      </div>
      {v.note && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.45 }}>{v.note}</p>}
      {derive && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--primary)', margin: '6px 0 0' }}>{t('session.deriveConseille')} {derive}</p>}
      {aEnc && <p style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.45 }}>{t('session.aEncadrerMsg')}</p>}
    </div>
  )
}

export function FamilleFiche({ famille: f, onBack }: { famille: FamilleExercice; onBack: () => void }) {
  const { t } = useI18n()
  const primaire = primaryMode(f.modes)
  const aEncadrer = f.flags.includes('a-encadrer')
  const derive = f.deriveRecommande ? nomDerive(f, f.deriveRecommande) : undefined

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
        <IconArrowLeft size={16} /> {t('session.retour')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{f.nom}</h2>
        {aEncadrer && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--r-sm)',
            background: 'var(--zone-bad-bg)', color: 'var(--zone-bad-border)', fontFamily: FB, fontSize: 11, fontWeight: 600 }}>
            <IconAlertTriangle size={13} /> {t('session.aEncadrer')}
          </span>
        )}
        {f.accessoire && <Tag>{t('session.accessoire')}</Tag>}
      </div>

      {derive && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4)',
          borderRadius: 'var(--r-md)', background: 'var(--primary-dim)', marginTop: 'var(--space-4)' }}>
          <IconShieldCheck size={17} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: 0 }}>
            {t('session.deriveConseille')} <strong style={{ color: 'var(--primary)' }}>{derive}</strong>
          </p>
        </div>
      )}
      {aEncadrer && <AEncadrerBanner />}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <Tag>{GROUPE_LABEL[f.groupe]}</Tag>
        <Tag>{t('session.difficulteN', { n: f.difficulteTechnique })}</Tag>
        {f.equipement.map(eq => <Tag key={eq}>{EQUIP_LABEL[eq]}</Tag>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        {f.muscles.map(m => <Tag key={m}>{MUSCLE_LABEL[m]}</Tag>)}
      </div>

      {/* Modes & prescription (couche coach IA) */}
      <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {f.modes.map(({ mode }) => {
          const presc = PRESCRIPTIONS[mode]
          const isPrim = mode === primaire
          return (
            <div key={mode} style={{ padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)',
              borderLeft: isPrim ? '3px solid var(--primary)' : '3px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{MODE_LABEL[mode]}</span>
                {isPrim && <Tag accent>{t('session.primaire')}</Tag>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)' }}>
                <span>{t('session.charge')} <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{presc.charge}</strong></span>
                <span>{t('session.tempo')} <strong style={{ color: 'var(--text)' }}>{presc.tempo}</strong></span>
                <span>{t('session.volume')} <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{presc.volume}</strong></span>
              </div>
            </div>
          )
        })}
      </div>

      {/* fiche complète OU brique sèche */}
      {f.fiche ? (
        <>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>{t('session.pourquoiExercice')}</h4>
            <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>{f.fiche.utilite}</p>
          </div>
          <Liste titre={t('session.execution')} items={f.fiche.execution} />
          <Liste titre={t('session.erreursFrequentes')} items={f.fiche.erreurs} />
        </>
      ) : (
        <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-5)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
          <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>
            {t('session.briquePre')}<strong style={{ color: 'var(--text)' }}>{t('session.briqueWord')}</strong>{t('session.briquePost')}
          </p>
        </div>
      )}

      {/* Variantes */}
      {f.variantes.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>
            {t('session.variantes')} <span style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>· {f.variantes.length}</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {f.variantes.map(v => <VarianteRow key={v.id} famille={f} v={v} />)}
          </div>
        </div>
      )}
    </div>
  )
}
