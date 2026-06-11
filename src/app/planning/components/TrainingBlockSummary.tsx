'use client'
// Section Training Bloc — deux onglets : « Training Bloc » (grille de cartes par sport,
// clic → overlay détail) et « Training Planification » (aperçu lecture seule). Tokens +
// SPORT_COLORS pour les teintes sport. createPortal côté overlay.
import { useState } from 'react'
import { TrainingBlockDetail } from './TrainingBlockDetail'
import { FriseV1 } from '@/components/planning/FriseV1'
import { loadBlocks, BLOCK_SPORTS, SPORT_LABEL, SPORT_COLOR, type BlockSport } from '../trainingBlocks'

const FB = 'var(--font-body)'

export function TrainingBlockSummary() {
  const [tab, setTab] = useState<'bloc' | 'plan'>('bloc')
  const [blocks, setBlocks] = useState(() => loadBlocks())
  const [open, setOpen] = useState<BlockSport | null>(null)
  const [creating, setCreating] = useState(false)
  const reload = () => setBlocks(loadBlocks())
  const active = BLOCK_SPORTS.filter(s => blocks[s.id])

  return (
    <section style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Onglets — segmented pill (pas d'underline) */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'inline-flex', gap: 0, background: 'var(--bg-card2)', borderRadius: 12, padding: 4 }}>
          {(['bloc', 'plan'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: FB, borderRadius: 9, transition: 'all .15s',
                background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-dim)', boxShadow: tab === t ? 'var(--shadow-card)' : 'none' }}>
              {t === 'bloc' ? 'Training Bloc' : 'Training Planification'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bloc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 16 }}>
          {active.map(s => {
            const b = blocks[s.id]!
            return (
              <div key={s.id} onClick={() => setOpen(s.id)}
                style={{ border: '1.5px solid var(--border)', borderRadius: 13, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 2px 12px var(--primary-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLOR[s.id], flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1, color: 'var(--text)', fontFamily: FB }}>{SPORT_LABEL[s.id]}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {Array.from({ length: b.weekTotal }, (_, i) => (
                      <span key={i} style={{ width: 12, height: 4, borderRadius: 4, background: i < b.weekCurrent ? 'var(--primary)' : 'var(--bg-card2)' }} />
                    ))}
                    <span className="tnum" style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 5 }}>S<strong style={{ color: 'var(--text-mid)' }}>{b.weekCurrent}</strong>/{b.weekTotal}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, minHeight: 22 }}>
                  {b.focus.map(q => (
                    <span key={q} style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-card2)', color: 'var(--text-mid)', borderRadius: 999, padding: '3px 9px', fontFamily: FB }}>{q}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: FB }}><strong className="tnum" style={{ color: 'var(--text)' }}>{b.sessions.length}</strong> séances</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>›</span>
                </div>
              </div>
            )
          })}
          {active.length === 0 && !creating && (
            <div style={{ gridColumn: '1/-1', padding: '20px 4px', color: 'var(--text-dim)', fontSize: 13, fontFamily: FB }}>
              Aucun bloc actif · <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setCreating(true)}>+ Créer un bloc</span>
            </div>
          )}
          {active.length === 0 && creating && BLOCK_SPORTS.map(s => (
            <button key={s.id} onClick={() => setOpen(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'plan' && (
        <div style={{ padding: '16px 20px 20px' }}>
          {active.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, fontFamily: FB }}>Aucun bloc à planifier.</p>
          ) : (
            // Frise lecture seule — clic n'importe où → détail du 1er bloc (édition Gantt = lot dédié)
            <div onClick={() => setOpen(active[0].id)} style={{ cursor: 'pointer', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <FriseV1 blocs={active.map(s => {
                const b = blocks[s.id]!
                return { sport: s.id, weekCurrent: b.weekCurrent, weekTotal: b.weekTotal, focus: b.focus, color: SPORT_COLOR[s.id], label: SPORT_LABEL[s.id] }
              })} />
            </div>
          )}
        </div>
      )}

      {open && <TrainingBlockDetail sport={open} activeSports={active.map(s => s.id)} onClose={() => { setOpen(null); setCreating(false); reload() }} onSaved={reload} />}
    </section>
  )
}
