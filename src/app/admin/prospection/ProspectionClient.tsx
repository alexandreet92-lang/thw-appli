'use client'

// Écran Prospection (admin). SVG brut, aucune lib de charts. Données : /api/admin/prospection.
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import type { ProspectionOverview, SendRow } from '@/lib/prospection/types'
import { lng, makeT, type Lng } from './labels'

type T = ReturnType<typeof makeT>
const TARGETS = [50, 100, 150, 200]
const LOCALE: Record<Lng, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' }
const FB = 'var(--font-body)'
const FD = 'var(--font-display)'

const card: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 20 }
const label: React.CSSProperties = { fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }
const hint: React.CSSProperties = { fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }
const h3: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg-card)', color: 'var(--text)',
  borderRadius: 'var(--r-md)', padding: '10px 12px', fontFamily: FB, fontSize: 14, border: 'none',
}
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary)', color: 'var(--bg)', borderRadius: 'var(--r-pill)', border: 'none',
  padding: '10px 18px', fontFamily: FB, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const quietBtn: React.CSSProperties = { ...primaryBtn, background: 'var(--bg-card)', color: 'var(--text)' }

function Kpi({ name, value, sub, tone }: { name: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div style={card}>
      <div style={label}>{name}</div>
      <div style={{ fontFamily: FB, fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 6, color: tone === 'warn' ? 'var(--charge-hard)' : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ ...hint, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function statusLabel(r: SendRow, t: T): { text: string; warn: boolean } {
  if (r.status === 'failed') return { text: t('st_failed'), warn: true }
  if (r.delivery_status === 'bounced') return { text: t('st_bounced'), warn: true }
  if (r.delivery_status === 'complained') return { text: t('st_complained'), warn: true }
  if (r.delivery_status === 'delivered') return { text: t('st_delivered'), warn: false }
  return { text: t('st_sent'), warn: false }
}

function WeekChart({ data, t, loc }: { data: ProspectionOverview['week']; t: T; loc: string }) {
  const W = 560, H = 150, base = 120
  const max = Math.max(1, ...data.map(d => d.sent))
  const step = W / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('c_title')} style={{ marginTop: 10 }}>
      <line x1={0} y1={base} x2={W} y2={base} stroke="var(--border)" strokeWidth={1} />
      {data.map((d, i) => {
        const hs = (d.sent / max) * (base - 8)
        const hc = (d.clicks / max) * (base - 8)
        const x = i * step + step / 2
        const dd = new Date(`${d.day}T12:00:00Z`).toLocaleDateString(loc, { weekday: 'short', timeZone: 'UTC' })
        return (
          <g key={d.day}>
            <rect x={x - 16} y={base - hs} width={18} height={hs} fill="var(--text)" rx={2} />
            <rect x={x + 4} y={base - hc} width={10} height={hc} fill="var(--primary)" rx={2} />
            <text x={x} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-dim)" fontFamily={FB}>{dd}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function ProspectionClient() {
  const { lang } = useI18n()
  const [l, setL] = useState<Lng>('fr')
  useEffect(() => { setL(lng(lang)) }, [lang])
  const t = makeT(l)
  const loc = LOCALE[l]

  const [data, setData] = useState<ProspectionOverview | null>(null)
  const [error, setError] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [postal, setPostal] = useState('')
  const [list, setList] = useState('')
  const [source, setSource] = useState('')
  const [consent, setConsent] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prospection', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const d = (await res.json()) as ProspectionOverview
      setData(d)
      setSubject(d.settings.subject); setBody(d.settings.body)
      setFromName(d.settings.from_name); setFromEmail(d.settings.from_email); setPostal(d.settings.postal_address)
      setError(false)
    } catch { setError(true) }
  }, [])
  useEffect(() => { void load() }, [load])

  const patch = useCallback(async (p: Record<string, unknown>) => {
    const res = await fetch('/api/admin/prospection', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
    })
    setMsg(res.ok ? makeT(l)('saved') : makeT(l)('save_err'))
    if (res.ok) await load()
  }, [l, load])

  const doImport = async () => {
    const res = await fetch('/api/admin/prospection/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: list, source, consent_note: consent }),
    })
    const j = (await res.json()) as { added?: number; duplicates?: number; invalid?: number; erreur?: string }
    if (res.ok) {
      setMsg(t('i_done', { a: j.added ?? 0, d: j.duplicates ?? 0, i: j.invalid ?? 0 }))
      setList(''); await load()
    } else setMsg(j.erreur ?? t('i_err'))
  }

  const sendTest = async () => {
    const res = await fetch('/api/admin/prospection/test', { method: 'POST' })
    const j = (await res.json()) as { to?: string; erreur?: string }
    setMsg(res.ok ? t('m_test_ok', { to: j.to ?? '' }) : (j.erreur ?? t('error')))
  }

  if (error) return <div style={{ padding: 32, fontFamily: FB, color: 'var(--text-mid)' }}>{t('error')}</div>
  if (!data) return <div style={{ padding: 32, fontFamily: FB, color: 'var(--text-mid)' }}>{t('loading')}</div>

  const d = data
  const errors = d.today.failed + d.today.bounced

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--text)' }}>
      <div>
        <div style={label}>{t('crumb')}</div>
        <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 600, margin: '4px 0 0' }}>{t('title')}</h1>
      </div>
      <p style={hint}>{t('note')}</p>
      {!d.sesReady && <p style={{ ...hint, color: 'var(--charge-hard)' }}>{t('sesOff')}</p>}
      {msg && <p role="status" style={{ ...hint, color: 'var(--text)' }}>{msg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Kpi name={t('k_sent')} value={`${d.today.sent} / ${d.ramp.limit}`} />
        <Kpi name={t('k_errors')} value={String(errors)} tone={errors > 0 ? 'warn' : undefined} />
        <Kpi name={t('k_clicks')} value={String(d.today.clicks)} />
        <Kpi name={t('k_unsub')} value={String(d.today.unsubscribes)} />
        <Kpi name={t('k_opens')} value={String(d.today.opens)} sub={t('k_opens_h')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={h3}>{t('s_title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={label}>{t('s_target')}</div>
            <div role="group" aria-label={t('s_target')} style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--r-pill)', width: 'fit-content' }}>
              {TARGETS.map(n => (
                <button key={n} type="button" aria-pressed={d.settings.daily_target === n}
                  onClick={() => void patch({ daily_target: n })}
                  style={{ border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '8px 18px', fontFamily: FB, fontSize: 14, fontVariantNumeric: 'tabular-nums',
                    background: d.settings.daily_target === n ? 'var(--primary)' : 'transparent',
                    color: d.settings.daily_target === n ? 'var(--bg)' : 'var(--text-mid)', fontWeight: d.settings.daily_target === n ? 600 : 400 }}>{n}</button>
              ))}
            </div>
            <p style={hint}>{t('s_target_h')}</p>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FB, fontSize: 13 }}>
              <span>{t('s_ramp', { w: d.ramp.week, n: d.ramp.weeks })}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t('s_today', { n: d.ramp.limit })}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-card2)', borderRadius: 'var(--r-pill)', marginTop: 10 }}>
              <div style={{ width: `${(d.ramp.week / d.ramp.weeks) * 100}%`, height: 6, background: 'var(--primary)', borderRadius: 'var(--r-pill)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FB, fontSize: 14 }}>
            <span>{t('s_auto')}</span>
            <button type="button" aria-pressed={d.settings.enabled} onClick={() => void patch({ enabled: !d.settings.enabled })}
              style={{ ...(d.settings.enabled ? primaryBtn : quietBtn), padding: '6px 16px', fontSize: 12 }}>
              {d.settings.enabled ? t('s_on') : t('s_off')}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FB, fontSize: 14 }}><span>{t('s_hour')}</span><span style={{ fontWeight: 500 }}>{t('s_hour_v')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FB, fontSize: 14 }}><span>{t('s_queue')}</span><span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{d.queue}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FB, fontSize: 14 }}><span>{t('s_total')}</span><span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{d.total}</span></div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={h3}>{t('c_title')}</h3><span style={hint}>{t('c_hint')}</span>
          </div>
          <WeekChart data={d.week} t={t} loc={loc} />
          <div style={{ display: 'flex', gap: 16, ...hint }}>
            <span><span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--text)', borderRadius: 2, marginRight: 6 }} />{t('c_sent')}</span>
            <span><span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--primary)', borderRadius: 2, marginRight: 6 }} />{t('c_clicks')}</span>
          </div>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={h3}>{t('t_title')}</h3><span style={hint}>{t('t_hint')}</span>
        </div>
        {d.recent.length === 0 ? <p style={{ ...hint, padding: '8px 0' }}>{t('t_empty')}</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FB, fontSize: 14, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>{t('t_to')}</th><th style={{ fontWeight: 500 }}>{t('t_time')}</th>
                  <th style={{ fontWeight: 500 }}>{t('t_status')}</th><th style={{ fontWeight: 500 }}>{t('t_click')}</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map(r => {
                  const st = statusLabel(r, t)
                  return (
                    <tr key={r.id} style={{ background: 'transparent' }}>
                      <td style={{ padding: '9px 0' }}>{r.email}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{new Date(r.sent_at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</td>
                      <td style={{ color: st.warn ? 'var(--charge-hard)' : 'var(--text)', fontWeight: st.warn ? 500 : 400 }}>{st.text}</td>
                      <td style={{ fontWeight: r.click_count > 0 ? 600 : 400, color: r.click_count > 0 ? 'var(--primary)' : 'var(--text-mid)' }}>{r.click_count > 0 ? t('yes') : t('no')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={h3}>{t('i_title')}</h3>
          <p style={hint}>{t('i_hint')}</p>
          <label style={label} htmlFor="pr-list">{t('i_list')}</label>
          <textarea id="pr-list" rows={6} value={list} onChange={e => setList(e.target.value)} style={{ ...field, resize: 'vertical' }} />
          <label style={label} htmlFor="pr-src">{t('i_source')}</label>
          <input id="pr-src" value={source} onChange={e => setSource(e.target.value)} style={field} />
          <label style={label} htmlFor="pr-con">{t('i_consent')}</label>
          <input id="pr-con" value={consent} onChange={e => setConsent(e.target.value)} style={field} />
          <div><button type="button" style={primaryBtn} disabled={!list.trim() || !source.trim() || !consent.trim()} onClick={() => void doImport()}>{t('i_go')}</button></div>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={h3}>{t('m_title')}</h3>
          <p style={hint}>{t('m_hint')}</p>
          <label style={label} htmlFor="pr-name">{t('m_name')}</label>
          <input id="pr-name" value={fromName} onChange={e => setFromName(e.target.value)} style={field} />
          <label style={label} htmlFor="pr-from">{t('m_from')}</label>
          <input id="pr-from" type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)} style={field} />
          <label style={label} htmlFor="pr-sub">{t('m_subject')}</label>
          <input id="pr-sub" value={subject} onChange={e => setSubject(e.target.value)} style={field} />
          <label style={label} htmlFor="pr-body">{t('m_body')}</label>
          <textarea id="pr-body" rows={9} value={body} onChange={e => setBody(e.target.value)} style={{ ...field, resize: 'vertical' }} />
          <label style={label} htmlFor="pr-addr">{t('m_addr')}</label>
          <input id="pr-addr" value={postal} onChange={e => setPostal(e.target.value)} style={field} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={primaryBtn}
              onClick={() => void patch({ subject, body, from_name: fromName, from_email: fromEmail, postal_address: postal })}>{t('save')}</button>
            <button type="button" style={quietBtn} onClick={() => void sendTest()}>{t('m_test')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
