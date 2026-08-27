'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Coach — PROGRAMMES : liste + assistant de création en 3 étapes.
// Route protégée par la garde /coach (accès coach requis).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import {
  listMyPrograms, createProgram, deleteProgram,
  LEVEL_LABEL, PREP_LABEL, type CoachProgram,
} from '@/lib/coach/programs'
import { startConnectOnboarding, getConnectStatus, getCoachEarnings, type ConnectStatus } from '@/lib/coach/connect'
import ProgramWizard from '@/components/coach/ProgramWizard'
import { useI18n } from '@/lib/i18n'

export default function CoachProgramsPage() {
  const { t } = useI18n()
  const [list, setList] = useState<CoachProgram[] | null>(null)
  const [editing, setEditing] = useState<CoachProgram | null>(null)
  const [busy, setBusy] = useState(false)
  const [connect, setConnect] = useState<ConnectStatus | null>(null)
  const [earnings, setEarnings] = useState<{ net: number; sales: number } | null>(null)

  useEffect(() => {
    void listMyPrograms().then(setList).catch(() => setList([]))
    void getConnectStatus().then(setConnect).catch(() => setConnect({ connected: false, chargesEnabled: false, payoutsEnabled: false }))
    void getCoachEarnings().then(e => setEarnings({ net: e.net, sales: e.sales })).catch(() => {})
  }, [])

  const onboard = async () => {
    setBusy(true)
    try { window.location.href = await startConnectOnboarding() }
    catch (e) { alert(e instanceof Error ? e.message : t('w1h.error')); setBusy(false) }
  }

  const openNew = async () => {
    setBusy(true)
    try {
      const id = await createProgram(t('w1h.new_program_default'))
      if (!id) return
      const fresh = (await listMyPrograms()).find(p => p.id === id) ?? null
      setList(await listMyPrograms())
      if (fresh) setEditing(fresh)
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    if (!confirm(t('w1h.confirm_delete_program'))) return
    await deleteProgram(id)
    setList(await listMyPrograms())
    if (editing?.id === id) setEditing(null)
  }

  // ── Assistant ──
  if (editing) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', boxSizing: 'border-box' }}>
          <button onClick={() => setEditing(null)} style={backBtn}>{t('w1h.back_my_programs')}</button>
        </div>
        <ProgramWizard program={editing} onDone={async () => { setEditing(null); setList(await listMyPrograms()) }} />
      </div>
    )
  }

  // ── Liste ──
  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{t('w1h.my_programs')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('w1h.programs_subtitle')}</p>
        </div>
        <button onClick={openNew} disabled={busy} style={primary}>{busy ? '…' : t('w1h.new_short')}</button>
      </div>

      {/* Paiements (Stripe Connect) */}
      {connect && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t('w1h.payments')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
              {connect.chargesEnabled
                ? <>{t('w1h.account_active')} · <span className="tnum">{earnings?.sales ?? 0}</span> {t('w1h.sales_word')} · <span className="tnum">{((earnings?.net ?? 0) / 100).toFixed(2)}</span> {t('w1h.euros_collected')}</>
                : connect.connected ? t('w1h.signup_incomplete') : t('w1h.setup_payments_desc')}
            </div>
          </div>
          {!connect.chargesEnabled && <button onClick={onboard} disabled={busy} style={primary}>{connect.connected ? t('w1h.complete') : t('w1h.setup_payments')}</button>}
        </div>
      )}

      {list === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1h.loading')}</p>
      ) : list.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('w1h.no_program')}</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 16px' }}>{t('w1h.create_first_program')}</p>
          <button onClick={openNew} disabled={busy} style={primary}>{t('w1h.new_program')}</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {list.map(p => {
            const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)
            return (
              <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.published ? 'var(--primary)' : 'var(--text-dim)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: p.published ? 'var(--primary)' : 'var(--text-dim)' }}>{p.published ? t('w1h.published') : t('w1h.draft')}</span>
                  {p.prep_type && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginLeft: 'auto' }}>{PREP_LABEL[p.prep_type]}</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>{p.title}</div>
                {p.objective && <div style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>{p.objective}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                  <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> {t('w1h.weeks_abbr')} · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessions}</span> {t('w1h.sessions')}{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(p)} style={{ ...primary, flex: 1 }}>{t('w1h.edit_verb')}</button>
                  <button onClick={() => remove(p.id)} aria-label={t('w1h.aria_delete')} style={ghost}>{t('w1h.delete_short')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const primary: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const ghost: React.CSSProperties = { padding: '9px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const backBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 4 }
