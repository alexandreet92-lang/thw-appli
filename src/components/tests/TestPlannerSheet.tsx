'use client'
// Planificateur de TEST partagé — ouvre la liste des tests de forme (mêmes
// tests que la page Performance), regroupés par sport. On clique un test pour
// voir son PROCÉDÉ (protocole détaillé) puis on l'ajoute au planning. Utilisé
// depuis le Planning (choix « Test » au tap sur un jour). Le parent reçoit un
// payload prêt à insérer dans planned_sessions.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconChevronRight, IconArrowLeft } from '@tabler/icons-react'
import { TESTS, PROTOCOLS, DIFFICULTY_COLOR, TEST_SPORT_TO_PLANNING, type TestDef } from '@/lib/tests/protocols'
import type { TestSport } from '@/app/performance/testTypes'
import TestProtocolView from './TestProtocolView'

const SPORT_TABS: { id: TestSport; label: string; color: string }[] = [
  { id: 'running',  label: 'Running',  color: '#22c55e' },
  { id: 'cycling',  label: 'Cyclisme', color: '#06B6D4' },
  { id: 'natation', label: 'Natation', color: '#38bdf8' },
  { id: 'aviron',   label: 'Aviron',   color: '#14b8a6' },
  { id: 'hyrox',    label: 'Hyrox',    color: '#ef4444' },
]

export interface TestPlanPayload {
  sport: string            // code planned_sessions (run/bike/swim/rowing/hyrox)
  testId: string
  title: string
  durationMin: number
  intensity: 'low' | 'medium' | 'high'
  notes: string
}

export default function TestPlannerSheet({ dateLabel, onClose, onConfirm }: {
  dateLabel?: string
  onClose: () => void
  onConfirm: (p: TestPlanPayload) => Promise<void> | void
}) {
  const [sport, setSport] = useState<TestSport>('running')
  const [open, setOpen] = useState<TestDef | null>(null)
  const [saving, setSaving] = useState(false)
  const accent = SPORT_TABS.find(s => s.id === sport)?.color ?? 'var(--primary)'
  const proto = open ? PROTOCOLS[open.id] : null

  async function confirm() {
    if (!open) return
    setSaving(true)
    try {
      const durMin = parseInt(String(open.duration).match(/\d+/)?.[0] ?? '', 10) || 30
      const p = PROTOCOLS[open.id]
      const notes = p
        ? `Test — ${open.name}. ${p.objectif}\nÉtapes : ${p.etapes.join(' · ')}`
        : `Test — ${open.name}. ${open.desc}`
      const intensity: TestPlanPayload['intensity'] = open.difficulty === 'Maximal' ? 'high' : open.difficulty === 'Intense' ? 'medium' : 'low'
      await onConfirm({ sport: TEST_SPORT_TO_PLANNING[sport], testId: open.id, title: `Test · ${open.name}`, durationMin: durMin, intensity, notes })
      onClose()
    } finally { setSaving(false) }
  }

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 48px))', zIndex: 9999,
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 22px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {open && <button onClick={() => setOpen(null)} aria-label="Retour" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconArrowLeft size={16} /></button>}
            <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {open ? open.name : 'Planifier un test'}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconX size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {!open ? (<>
              {/* Onglets sport */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
                {SPORT_TABS.map(s => {
                  const on = sport === s.id
                  return <button key={s.id} onClick={() => setSport(s.id)} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: on ? `${s.color}1f` : 'var(--bg-card)', color: on ? s.color : 'var(--text-dim)' }}>{s.label}</button>
                })}
              </div>
              {/* Liste des tests */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TESTS[sport].map(test => (
                  <button key={test.id} onClick={() => setOpen(test)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{test.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${DIFFICULTY_COLOR[test.difficulty]}20`, color: DIFFICULTY_COLOR[test.difficulty], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{test.difficulty}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>· {test.duration}</span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{test.desc}</span>
                    </span>
                    <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </>) : (
              /* Procédé du test sélectionné */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${DIFFICULTY_COLOR[open.difficulty]}20`, color: DIFFICULTY_COLOR[open.difficulty], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{open.difficulty}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 600 }}>Durée : {open.duration}</span>
                </div>
                {proto ? (
                  <TestProtocolView proto={proto} accent={accent} />
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-mid)' }}>{open.desc}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {open && (
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 22px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
            <button onClick={confirm} disabled={saving} style={{ width: '100%', maxWidth: 640, padding: 13, borderRadius: 999, background: accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
              {saving ? '…' : `Ajouter au planning${dateLabel ? ` · ${dateLabel}` : ''}`}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  )
}
