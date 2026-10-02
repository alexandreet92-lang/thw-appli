'use client'
// ══════════════════════════════════════════════════════════════════
// PROGRAMMES COACH — version MOBILE : titre + rond « + », carte paiements
// (Stripe Connect : ventes, montant encaissé, configuration), cartes
// programme (statut, prépa, titre, objectif, volume) qui entrent en cascade,
// actions pilule. Gestionnaires = ceux de la page.
// ══════════════════════════════════════════════════════════════════
import { useI18n } from '@/lib/i18n'
import { LEVEL_LABEL, PREP_LABEL, type CoachProgram } from '@/lib/coach/programs'
import type { ConnectStatus } from '@/lib/coach/connect'
import { MPage, MTitle, Rise, CCard, CountUp, EmptyM, CTA, MiniPill, IconTile, RoundBtn, Ico, ICON, TILE, NUM, Tag } from './CoachKit'

export default function ProgramsMobile({ list, busy, connect, earnings, onNew, onEdit, onDelete, onOnboard }: {
  list: CoachProgram[] | null; busy: boolean; connect: ConnectStatus | null; earnings: { net: number; sales: number } | null
  onNew: () => void; onEdit: (p: CoachProgram) => void; onDelete: (id: string) => void; onOnboard: () => void
}) {
  const { t } = useI18n()
  return (
    <MPage>
      <MTitle title={t('w1h.my_programs')} sub={t('w1h.programs_subtitle')}
        right={<span data-guide="coach-programs-new"><RoundBtn label={t('w1h.new_program')} onClick={onNew} disabled={busy}><Ico d={ICON.plus} size={22} sw={2.2} /></RoundBtn></span>} />

      {/* Paiements (Stripe Connect) */}
      {connect && (
        <Rise i={1}>
          <CCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconTile color={TILE.green} size={42}><Ico d={ICON.card} size={20} /></IconTile>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{t('w1h.payments')}</div>
                <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 2 }}>
                  {connect.chargesEnabled ? t('w1h.account_active') : connect.connected ? t('w1h.signup_incomplete') : t('w1h.setup_payments_desc')}
                </div>
              </div>
            </div>
            {connect.chargesEnabled ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                <div style={{ background: 'var(--surface-chip)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                  <div style={{ ...NUM, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}><CountUp value={earnings?.sales ?? 0} /></div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{t('w1h.sales_word')}</div>
                </div>
                <div style={{ background: 'var(--surface-chip)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                  <div style={{ ...NUM, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}><CountUp value={(earnings?.net ?? 0) / 100} decimals={2} /></div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{t('w1h.euros_collected')}</div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14 }}><CTA onClick={onOnboard} disabled={busy}>{connect.connected ? t('w1h.complete') : t('w1h.setup_payments')}</CTA></div>
            )}
          </CCard>
        </Rise>
      )}

      {list === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 150, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : list.length === 0 ? (
        <Rise i={2} style={{ marginTop: 14 }}>
          <CCard>
            <EmptyM icon={<Ico d={<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>} size={26} />}
              title={t('w1h.no_program')} hint={t('w1h.create_first_program')} action={<CTA onClick={onNew} disabled={busy}>{t('w1h.new_program')}</CTA>} />
          </CCard>
        </Rise>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {list.map((p, i) => {
            const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)
            return (
              <Rise key={p.id} i={i + 2}>
                <CCard>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color={p.published ? 'var(--primary)' : 'var(--text-mid)'}>{p.published ? t('w1h.published') : t('w1h.draft')}</Tag>
                    {p.prep_type && <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{PREP_LABEL[p.prep_type]}</span>}
                  </div>
                  <button type="button" onClick={() => onEdit(p)} className="cm-press" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: 0, margin: '12px 0 0', cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
                    <span style={{ display: 'block', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{p.title}</span>
                    {p.objective && <span style={{ display: 'block', fontSize: 15, color: 'var(--text-mid)', marginTop: 4, lineHeight: 1.4 }}>{p.objective}</span>}
                  </button>
                  <div style={{ display: 'flex', gap: 18, margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <Stat n={p.duration_weeks} l={t('w1h.weeks_abbr')} />
                    <Stat n={sessions} l={t('w1h.sessions')} />
                    {p.level && <div style={{ minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 800 }}>{LEVEL_LABEL[p.level]}</div><div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{t('w1d.level')}</div></div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <CTA onClick={() => onEdit(p)} style={{ minHeight: 46, fontSize: 16, flex: 1 }}>{t('w1h.edit_verb')}</CTA>
                    <MiniPill tone="danger" onClick={() => onDelete(p.id)}><Ico d={ICON.trash} size={17} />{t('w1h.delete_short')}</MiniPill>
                  </div>
                </CCard>
              </Rise>
            )
          })}
        </div>
      )}
    </MPage>
  )
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...NUM, fontSize: 17, fontWeight: 800 }}><CountUp value={n} /></div>
      <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{l}</div>
    </div>
  )
}
