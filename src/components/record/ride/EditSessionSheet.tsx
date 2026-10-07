'use client'
// Feuille « Modifier la séance » (langage record kit) — édition EN DIRECT des
// blocs du profil home trainer : ajouter / supprimer / réordonner / dupliquer,
// et éditer la cible (W), la durée (min:sec) et le nom. Chaque mutation renvoie
// un RidePlan ré-indexé (t0/t1/totalS recalculés) au parent ; le minuteur et
// l'enregistrement continuent de tourner côté moteur.
import type { CSSProperties } from 'react'
import { RkSheet, RkCta, RkIco, RK_ICON } from '../kit/RecordKit'
import { haptic } from '@/lib/haptics'
import { zoneIndex, ZONES } from './zones'
import type { RidePlan, RideBlock } from './types'
import { useI18n } from '@/lib/i18n'

function reindex(title: string, blocks: RideBlock[]): RidePlan {
  let t = 0
  const out = blocks.map(b => { const t0 = t; t += Math.max(1, b.durationS); return { ...b, t0, t1: t } })
  return { title, blocks: out, totalS: t }
}

interface Props {
  open: boolean
  onClose: () => void
  plan: RidePlan | null
  ftp: number
  onChange: (plan: RidePlan) => void
  isDark: boolean
}

export default function EditSessionSheet({ open, onClose, plan, ftp, onChange, isDark }: Props) {
  const { t } = useI18n()
  const rows = plan?.blocks ?? []
  const title = plan?.title ?? t('w3b.home_trainer')
  const commit = (bs: RideBlock[]) => onChange(reindex(title, bs))

  const patch = (i: number, p: Partial<RideBlock>) => commit(rows.map((b, k) => (k === i ? { ...b, ...p } : b)))
  const del = (i: number) => { if (rows.length <= 1) return; commit(rows.filter((_, k) => k !== i)) }
  const dup = (i: number) => { const c = [...rows]; c.splice(i + 1, 0, { ...rows[i] }); commit(c) }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= rows.length) return
    const c = [...rows]; const tmp = c[i]; c[i] = c[j]; c[j] = tmp; commit(c)
  }
  const add = () => commit([...rows, { name: t('ht.newBlock'), kind: 'block', durationS: 300, targetW: Math.max(0, Math.round((ftp || 200) * 0.6)), t0: 0, t1: 0 }])

  const miniBtn: CSSProperties = { width: 34, height: 34, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
  const field: CSSProperties = { width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 16, outline: 'none', fontVariantNumeric: 'tabular-nums' }
  const lbl: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', margin: '0 0 4px' }

  return (
    <RkSheet open={open} onClose={onClose} title={t('ht.editSession')} isDark={isDark} zIndex={10060} full
      footer={<RkCta variant="primary" onClick={onClose}>{t('ht.editDone')}</RkCta>}>
      {rows.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--text-mid)', textAlign: 'center', padding: '18px 8px', fontWeight: 600 }}>{t('ht.noBlocks')}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((b, i) => {
          const zc = ZONES[zoneIndex(b.targetW, ftp)].token
          const pct = ftp > 0 ? Math.round((b.targetW / ftp) * 100) : 0
          const mins = Math.floor(b.durationS / 60)
          const secs = b.durationS % 60
          return (
            <div key={i} style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: zc, flexShrink: 0 }} />
                <input value={b.name} onChange={e => patch(i, { name: e.target.value })} aria-label={t('ht.blockName')}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, outline: 'none' }} />
                <span className="rk-num" style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700 }}>{pct}% FTP</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <p style={lbl}>{t('ht.targetW')}</p>
                  <input type="number" inputMode="numeric" step={5} min={0} value={b.targetW}
                    onChange={e => patch(i, { targetW: Math.max(0, parseInt(e.target.value) || 0) })} style={field} />
                </div>
                <div>
                  <p style={lbl}>min</p>
                  <input type="number" inputMode="numeric" step={1} min={0} value={mins}
                    onChange={e => patch(i, { durationS: Math.max(1, (Math.max(0, parseInt(e.target.value) || 0)) * 60 + secs) })} style={field} />
                </div>
                <div>
                  <p style={lbl}>sec</p>
                  <input type="number" inputMode="numeric" step={5} min={0} max={59} value={secs}
                    onChange={e => patch(i, { durationS: Math.max(1, mins * 60 + Math.min(59, Math.max(0, parseInt(e.target.value) || 0))) })} style={field} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" aria-label={t('ht.moveUp')} disabled={i === 0} onClick={() => { haptic('light'); move(i, -1) }} style={{ ...miniBtn, opacity: i === 0 ? 0.4 : 1 }}><RkIco d={<path d="m18 15-6-6-6 6" />} size={18} /></button>
                  <button type="button" aria-label={t('ht.moveDown')} disabled={i === rows.length - 1} onClick={() => { haptic('light'); move(i, 1) }} style={{ ...miniBtn, opacity: i === rows.length - 1 ? 0.4 : 1 }}><RkIco d={RK_ICON.down} size={18} /></button>
                  <button type="button" aria-label={t('ht.duplicate')} onClick={() => { haptic('light'); dup(i) }} style={miniBtn}><RkIco d={RK_ICON.copy} size={16} /></button>
                  <button type="button" aria-label={t('ht.delete')} disabled={rows.length <= 1} onClick={() => { haptic('medium'); del(i) }} style={{ ...miniBtn, color: 'var(--danger)', background: 'var(--danger-soft)', opacity: rows.length <= 1 ? 0.4 : 1 }}><RkIco d={RK_ICON.trash} size={16} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={() => { haptic('light'); add() }} className="rk-press"
        style={{ width: '100%', marginTop: 12, minHeight: 50, borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-mid)', background: 'transparent', color: 'var(--primary)', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <RkIco d={RK_ICON.plus} size={18} /> {t('ht.addBlock')}
      </button>
    </RkSheet>
  )
}
