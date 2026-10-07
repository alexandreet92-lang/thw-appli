'use client'
// Page 3 — Profil de séance. Graphique SVG (barres cibles + tracé réel +
// curseur), carte « bloc en cours » (cible W, %FTP, temps restant, cadence
// cible), ligne « bloc suivant », puis la liste complète des intervalles
// (en cours surligné, faits estompés). Langage record kit (cartes à rayon token,
// chiffres tabulaires, couleurs de zones).
import ProfileChart from '../charts/ProfileChart'
import { zoneIndex, ZONES } from '../zones'
import { fmtMs } from '../format'
import type { RideView } from '../viewModel'
import { useI18n } from '@/lib/i18n'

export default function RideProfile({ v }: { v: RideView }) {
  const { t } = useI18n()
  const blocks = v.plan?.blocks ?? []
  const curIdx = v.current ? blocks.indexOf(v.current) : -1
  const cur = curIdx >= 0 ? blocks[curIdx] : null
  const next = curIdx >= 0 ? blocks[curIdx + 1] : null
  const curZc = cur ? ZONES[zoneIndex(cur.targetW, v.ftp)].token : 'var(--text-dim)'
  const curPct = cur && v.ftp > 0 ? Math.round((cur.targetW / v.ftp) * 100) : 0
  const remaining = cur ? Math.max(0, cur.t1 - v.t) : 0
  const progress = cur && cur.t1 > cur.t0 ? Math.min(1, (v.t - cur.t0) / (cur.t1 - cur.t0)) : 0

  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>{t('ride.sessionProfile')}</div>

      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 10, height: 140, flexShrink: 0 }}>
        <ProfileChart plan={v.plan} samples={v.samples} ftp={v.ftp} t={v.t} />
      </div>

      {/* Bloc en cours */}
      {cur && (
        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: curZc, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 800 }} className="rk-num">{curIdx + 1}/{blocks.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 2 }}>{t('w3b.target')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="rk-num" style={{ fontSize: 34, fontWeight: 800, color: curZc, lineHeight: 1 }}>{cur.targetW > 0 ? cur.targetW : '—'}</span>
                {cur.targetW > 0 && <span style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700 }}>W · {curPct}%</span>}
              </div>
              {cur.cadenceTarget != null && (
                <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginTop: 6 }}>{t('w3b.cadence_target', { n: cur.cadenceTarget })}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 2 }}>{t('w3b.remaining_interval')}</div>
              <span className="rk-num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{fmtMs(remaining)}</span>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 6, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: curZc, borderRadius: 'var(--r-pill)', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      {/* Bloc suivant */}
      {next && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', marginTop: 10, opacity: 0.85 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ZONES[zoneIndex(next.targetW, v.ftp)].token, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 800 }}>{t('ht.next')}</span>
          <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.name}</span>
          <span className="rk-num" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-mid)', fontWeight: 800, whiteSpace: 'nowrap' }}>{next.targetW} W · {fmtMs(next.durationS)}</span>
        </div>
      )}

      {!v.plan && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-mid)', fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>
          {t('ht.freeRideHint')}
        </div>
      )}

      {blocks.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 12, minHeight: 0 }}>
          {blocks.map((b, i) => {
            const zc = ZONES[zoneIndex(b.targetW, v.ftp)].token
            const state = i === curIdx ? 'now' : (curIdx >= 0 && i < curIdx) ? 'done' : 'todo'
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 10px',
                background: state === 'now' ? 'var(--primary-dim)' : 'transparent',
                borderRadius: state === 'now' ? 'var(--r-sm)' : 0,
                borderBottom: state === 'now' ? 'none' : '1px solid var(--border)',
              }}>
                <span style={{ width: 4, height: 26, borderRadius: 2, background: zc, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: state === 'now' ? 'var(--text)' : state === 'done' ? 'var(--text-dim)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}{b.of ? ` ${b.rep}/${b.of}` : ''}
                </span>
                <span className="rk-num" style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 800 }}>{b.targetW} W · {Math.round(b.durationS / 60)} min</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
