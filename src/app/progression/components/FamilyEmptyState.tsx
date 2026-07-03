'use client'

// État vide contextuel pour les familles « structurées » (VMA/Seuil/FTP/…)
// non encore détectables (cf. RAPPORT_PROGRESSION_AUDIT.md).
import { useI18n } from '@/lib/i18n'

const MESSAGE_KEYS: Record<string, string> = {
  vma: 'progression.familyMsgVma',
  seuil: 'progression.familyMsgSeuil',
  ftp: 'progression.familyMsgFtp',
  pma: 'progression.familyMsgPma',
  anaerobie: 'progression.familyMsgAnaerobie',
  sprints: 'progression.familyMsgSprints',
  squat: 'progression.familyMsgSquat',
  developpe_couche: 'progression.familyMsgDeveloppeCouche',
  deadlift: 'progression.familyMsgDeadlift',
  traction: 'progression.familyMsgTraction',
  dips: 'progression.familyMsgDips',
  developpe_militaire: 'progression.familyMsgDeveloppeMilitaire',
  front_squat: 'progression.familyMsgFrontSquat',
  css: 'progression.familyMsgCss',
  test_400m: 'progression.familyMsgTest400m',
  endurance: 'progression.familyMsgEndurance',
}

export function FamilyEmptyState({ family, label }: { family: string; label: string }) {
  const { t } = useI18n()
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12, opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>{t('progression.familyComingSoon', { label })}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 420, margin: '0 auto 10px' }}>{MESSAGE_KEYS[family] ? t(MESSAGE_KEYS[family]) : t('progression.familyMsgDefault')}</p>
      <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>{t('progression.familyHintBefore')}<strong>{t('progression.familyGeneralTab')}</strong>{t('progression.familyHintAfter')}</p>
    </div>
  )
}
