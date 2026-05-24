'use client'
import { useEffect, useState } from 'react'

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

const PAGES_DEFAULT = [
  { id: 1, name: 'Données', fields: ['Durée', 'Distance', 'Vitesse', 'D+', 'Watts', 'FC', 'Watts moy'] },
  { id: 2, name: 'Carte',   fields: ['Carte', 'Watts', 'Distance'] },
  { id: 3, name: 'Puissance / Lap', fields: ['Watts', 'Durée lap', 'Watts moy lap', 'FC moy lap', 'Cadence', 'Altitude', 'Watts nor.'] },
]

const SENSORS = [
  { name: 'Fréquence cardiaque', status: 'Non connecté' },
  { name: 'Puissance',           status: 'Non connecté' },
  { name: 'Cadence',             status: 'Non connecté' },
]

export default function CyclingSettings({ open, onClose, isDark }: Props) {
  const t = getTheme(isDark)
  const [visible, setVisible] = useState(false)
  const [gpsAlert, setGpsAlert] = useState(true)
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0, transition: 'opacity 200ms',
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        height: '80vh',
        background: t.bg, color: t.text,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.separator }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Réglages vélo
          </h2>
          <button onClick={onClose} aria-label="Fermer"
            style={{ color: t.dim, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
          {/* Section Pages */}
          <SectionTitle t={t}>Pages de données</SectionTitle>
          {PAGES_DEFAULT.map(p => (
            <div key={p.id} style={{
              background: t.cardBg,
              border: `1px solid ${t.separator}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: t.text, fontSize: 14 }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: t.dim }}>{p.fields.join(' · ')}</p>
              </div>
              <span style={{ fontSize: 12, color: t.dim }}>Bientôt</span>
            </div>
          ))}

          {/* Section Capteurs */}
          <SectionTitle t={t}>
            Capteurs <Badge>Bientôt disponible</Badge>
          </SectionTitle>
          {SENSORS.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: `1px solid ${t.separator}`,
            }}>
              <span style={{ fontSize: 14, color: t.text }}>{s.name}</span>
              <span style={{ fontSize: 12, color: t.dim }}>{s.status}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, fontStyle: 'italic', color: t.dim, padding: '10px 4px 0' }}>
            La connexion Bluetooth sera disponible lors du lancement sur l&apos;App Store.
          </p>

          {/* Section Unités */}
          <SectionTitle t={t}>Unités</SectionTitle>
          <ToggleRow label="Métrique (km, m)" active t={t} />
          <ToggleRow label="Impérial (miles, ft)" disabled badge="Bientôt disponible" t={t} />

          {/* Section Alertes */}
          <SectionTitle t={t}>Alertes</SectionTitle>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 14px',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: t.text }}>Alerte fin GPS</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: t.dim }}>Notification si le GPS perd le signal</p>
            </div>
            <button
              onClick={() => setGpsAlert(v => !v)}
              role="switch"
              aria-checked={gpsAlert}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: gpsAlert ? '#06B6D4' : t.separator,
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: gpsAlert ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children, t }: { children: React.ReactNode; t: ReturnType<typeof getTheme> }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: t.dim,
      padding: '14px 4px 6px', margin: 0,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>{children}</p>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
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
      padding: '12px 14px', borderBottom: `1px solid ${t.separator}`,
      opacity: disabled ? 0.6 : 1,
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
