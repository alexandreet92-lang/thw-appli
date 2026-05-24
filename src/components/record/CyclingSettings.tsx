'use client'
import { useEffect, useState } from 'react'
import { useCyclingConfig } from '@/hooks/useCyclingConfig'
import { fieldById, type DataPage } from '@/types/cycling'
import PageEditor from './PageEditor'

interface Props {
  open: boolean
  onClose: () => void
  isDark: boolean
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.55)' : '#666',
    dim:       isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    cardBg:    isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
  }
}

const SENSORS = [
  { name: 'Fréquence cardiaque', status: 'Non connecté' },
  { name: 'Puissance',           status: 'Non connecté' },
  { name: 'Cadence',             status: 'Non connecté' },
]

export default function CyclingSettings({ open, onClose, isDark }: Props) {
  const t = getTheme(isDark)
  const { pages, savePages } = useCyclingConfig()
  const [closing, setClosing] = useState(false)
  const [gpsAlert, setGpsAlert] = useState(true)
  const [editing, setEditing] = useState<DataPage | null>(null)

  useEffect(() => { if (open) setClosing(false) }, [open])
  if (!open) return null

  const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return
    const next = [...pages]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    void savePages(next)
  }
  const addNewPage = () => {
    const newPage: DataPage = {
      id: `page_${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      type: 'data',
      fields: ['duration', 'distance', 'speed'],
    }
    void savePages([...pages, newPage])
    setEditing(newPage)
  }
  const deletePage = (id: string) => {
    if (pages.length <= 1) return
    void savePages(pages.filter(p => p.id !== id))
  }
  const handleSaveEdit = (updated: DataPage) => {
    void savePages(pages.map(p => (p.id === updated.id ? updated : p)))
    setEditing(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
          animation: closing ? 'fade-out 200ms ease-in forwards' : 'fade-in 200ms ease-out forwards',
        }}
      />
      <div
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          height: '80vh',
          background: t.bg, color: t.text,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.separator }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Réglages vélo
          </h2>
          <button onClick={handleClose} aria-label="Fermer"
            style={{ color: t.dim, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {/* Pages de données — interactive */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Pages de données
            </span>
            <button onClick={addNewPage}
              style={{ fontSize: 12, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              + Ajouter
            </button>
          </div>
          {pages.map((page, idx) => (
            <div key={page.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 0', borderBottom: `1px solid ${t.separator}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => movePage(idx, idx - 1)} disabled={idx === 0} aria-label="Monter"
                  style={{ background: 'none', border: 'none', cursor: idx===0?'default':'pointer',
                           opacity: idx===0?0.2:0.55, color: t.text, padding: '2px 4px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 9l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={() => movePage(idx, idx + 1)} disabled={idx === pages.length - 1} aria-label="Descendre"
                  style={{ background: 'none', border: 'none', cursor: idx===pages.length-1?'default':'pointer',
                           opacity: idx===pages.length-1?0.2:0.55, color: t.text, padding: '2px 4px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(6,182,212,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#06B6D4',
              }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{page.name}</p>
                <p style={{
                  fontSize: 11, color: t.dim, margin: '2px 0 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {page.type === 'map' ? 'Carte + ' : ''}
                  {page.fields.map(id => fieldById(id)?.label).filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={() => setEditing(page)}
                style={{ background: 'none', border: `1px solid ${t.separator}`, borderRadius: 8,
                         padding: '6px 12px', fontSize: 12, color: t.text, cursor: 'pointer', flexShrink: 0 }}>
                Modifier
              </button>
              {pages.length > 1 && (
                <button onClick={() => deletePage(page.id)} aria-label="Supprimer"
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                           color: 'rgba(239,68,68,0.7)', padding: 4, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Capteurs */}
          <SectionTitle t={t}>
            Capteurs <Badge>Bientôt disponible</Badge>
          </SectionTitle>
          {SENSORS.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: `1px solid ${t.separator}`,
            }}>
              <span style={{ fontSize: 14, color: t.text }}>{s.name}</span>
              <span style={{ fontSize: 12, color: t.dim }}>{s.status}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, fontStyle: 'italic', color: t.dim, padding: '10px 0 0' }}>
            La connexion Bluetooth sera disponible lors du lancement sur l&apos;App Store.
          </p>

          {/* Unités */}
          <SectionTitle t={t}>Unités</SectionTitle>
          <ToggleRow label="Métrique (km, m)" active t={t} />
          <ToggleRow label="Impérial (miles, ft)" disabled badge="Bientôt disponible" t={t} />

          {/* Alertes */}
          <SectionTitle t={t}>Alertes</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: t.text }}>Alerte fin GPS</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: t.dim }}>Notification si le GPS perd le signal</p>
            </div>
            <button
              onClick={() => setGpsAlert(v => !v)}
              role="switch" aria-checked={gpsAlert}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: gpsAlert ? '#06B6D4' : t.separator,
                position: 'relative', transition: 'background 0.2s',
              }}>
              <span style={{
                position: 'absolute', top: 3, left: gpsAlert ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}/>
            </button>
          </div>
        </div>
      </div>

      <PageEditor
        open={!!editing}
        page={editing}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        isDark={isDark}
      />

      <style>{`
        @keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  )
}

function SectionTitle({ children, t }: { children: React.ReactNode; t: ReturnType<typeof getTheme> }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: t.dim,
      padding: '20px 0 8px', margin: 0,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>{children}</p>
  )
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: 'rgba(6,182,212,0.15)', color: '#06B6D4',
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>{children}</span>
  )
}
function ToggleRow({ label, active, disabled, badge, t }: {
  label: string; active?: boolean; disabled?: boolean; badge?: string; t: ReturnType<typeof getTheme>
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: `1px solid ${t.separator}`, opacity: disabled ? 0.6 : 1,
    }}>
      <span style={{ fontSize: 14, color: t.text }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && <Badge>{badge}</Badge>}
        {active && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9l4 4 8-8" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}
