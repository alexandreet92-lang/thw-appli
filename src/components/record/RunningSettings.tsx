'use client'
import { useState } from 'react'
import { useRunningConfig } from '@/hooks/useRunningConfig'
import { useRunningSettings } from '@/hooks/useRunningSettings'
import type { DataPage } from '@/types/cycling'
import { runningFieldById } from '@/types/running'

interface Props { open: boolean; onClose: () => void; isDark: boolean }

function getTheme(isDark: boolean) {
  return {
    bg: isDark ? '#0A0A0A' : '#FFFFFF', text: isDark ? '#FFFFFF' : '#0A0A0A',
    dim: isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
  }
}

const Row = ({ label, children, theme }: { label: string; children: React.ReactNode; theme: ReturnType<typeof getTheme> }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${theme.separator}` }}>
    <span style={{ fontSize: 15, color: theme.text }}>{label}</span>
    {children}
  </div>
)

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, background: value ? '#06B6D4' : '#3A3A3A', cursor: 'pointer', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
  </div>
)

export default function RunningSettings({ open, onClose, isDark }: Props) {
  const t = getTheme(isDark)
  const [closing, setClosing] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const { pages, savePages } = useRunningConfig('running')
  const { settings, updateSetting } = useRunningSettings()

  if (!open) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return
    const next = [...pages]; const [m] = next.splice(from, 1); next.splice(to, 0, m)
    void savePages(next)
  }

  const renderSection = () => {
    if (activeSection === 'pages') return (
      <div>
        {pages.map((page: DataPage, idx: number) => (
          <div key={page.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${t.separator}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => movePage(idx, idx - 1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.2 : 0.6, color: t.text, padding: '2px 4px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => movePage(idx, idx + 1)} disabled={idx === pages.length - 1} style={{ background: 'none', border: 'none', cursor: idx === pages.length - 1 ? 'default' : 'pointer', opacity: idx === pages.length - 1 ? 0.2 : 0.6, color: t.text, padding: '2px 4px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#06B6D4', flexShrink: 0 }}>{idx + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{page.name}</p>
              <p style={{ fontSize: 11, color: t.dim, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {page.type === 'map' ? 'Carte GPS' : page.fields.map(id => runningFieldById(id)?.label).filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
    if (activeSection === 'athlete') return (
      <div>
        {[
          { path: 'athlete.vma', label: 'VMA (km/h)', val: String(settings.athlete.vma) },
          { path: 'athlete.maxHr', label: 'FC max (bpm)', val: String(settings.athlete.maxHr) },
          { path: 'athlete.restHr', label: 'FC repos (bpm)', val: String(settings.athlete.restHr) },
          { path: 'athlete.pace5k', label: 'Allure 5km (min/km)', val: settings.athlete.pace5k },
          { path: 'athlete.pace10k', label: 'Allure 10km', val: settings.athlete.pace10k },
          { path: 'athlete.paceHalf', label: 'Allure semi', val: settings.athlete.paceHalf },
          { path: 'athlete.paceMarathon', label: 'Allure marathon', val: settings.athlete.paceMarathon },
        ].map(({ path, label, val }) => (
          <div key={path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${t.separator}` }}>
            <span style={{ fontSize: 15, color: t.text }}>{label}</span>
            <input defaultValue={val} onBlur={e => updateSetting(path, path.includes('Hr') || path === 'athlete.vma' ? Number(e.target.value) : e.target.value)}
              style={{ width: 80, textAlign: 'right', background: 'none', border: 'none', borderBottom: `1px solid ${t.separator}`, color: t.text, fontSize: 15, outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
          </div>
        ))}
      </div>
    )
    if (activeSection === 'recording') return (
      <div>
        <Row label="Auto-pause" theme={t}><Toggle value={settings.recording.autoPause} onChange={v => updateSetting('recording.autoPause', v)} /></Row>
        <Row label="Auto-lap (km, 0=off)" theme={t}>
          <input type="number" min="0" max="100" value={settings.recording.autoLap} onChange={e => updateSetting('recording.autoLap', Number(e.target.value))}
            style={{ width: 60, textAlign: 'right', background: 'none', border: 'none', borderBottom: `1px solid ${t.separator}`, color: t.text, fontSize: 15, outline: 'none' }} />
        </Row>
      </div>
    )
    if (activeSection === 'display') return (
      <div>
        <Row label="Unité allure" theme={t}>
          <select value={settings.display.paceUnit} onChange={e => updateSetting('display.paceUnit', e.target.value)}
            style={{ background: t.bg, border: `1px solid ${t.separator}`, borderRadius: 8, padding: '6px 10px', fontSize: 14, color: t.text, outline: 'none' }}>
            <option value="min/km">min/km</option>
            <option value="min/mile">min/mile</option>
          </select>
        </Row>
        <Row label="Police données" theme={t}>
          <select value={settings.display.dataFont} onChange={e => updateSetting('display.dataFont', e.target.value)}
            style={{ background: t.bg, border: `1px solid ${t.separator}`, borderRadius: 8, padding: '6px 10px', fontSize: 14, color: t.text, outline: 'none' }}>
            {['system','mono','rounded','condensed','sport'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Row>
        <Row label="Garder l'écran allumé" theme={t}><Toggle value={settings.display.keepAwake} onChange={v => updateSetting('display.keepAwake', v)} /></Row>
      </div>
    )
    if (activeSection === 'sensors') return (
      <div>
        {[
          { label: 'Fréquence cardiaque', sub: 'Bluetooth LE' },
          { label: 'Cadence / foulée',    sub: 'Bluetooth LE' },
        ].map(({ label, sub }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${t.separator}` }}>
            <div><p style={{ fontSize: 15, color: t.text, margin: 0 }}>{label}</p><p style={{ fontSize: 12, color: t.dim, margin: '2px 0 0' }}>{sub}</p></div>
            <span style={{ fontSize: 12, color: t.dim, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px' }}>Bientôt</span>
          </div>
        ))}
      </div>
    )
    return null
  }

  const SECTIONS = [
    { id: 'pages', label: 'Pages de données', desc: 'Ordre des écrans' },
    { id: 'athlete', label: 'Profil athlète', desc: 'VMA, FC max, allures cibles' },
    { id: 'recording', label: 'Enregistrement', desc: 'Auto-pause, auto-lap' },
    { id: 'display', label: 'Affichage', desc: 'Unité allure, police' },
    { id: 'sensors', label: 'Capteurs', desc: 'FC, cadence/foulée' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: closing ? 'fade-out 200ms ease-in forwards' : 'fade-in 200ms ease-out forwards' }} />
      <div className={closing ? 'sheet-close' : 'sheet-open'} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '80vh', background: t.bg, color: t.text, borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.separator }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>Réglages running</h2>
          <button onClick={handleClose} style={{ color: t.dim, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 24 }}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${t.separator}`, textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: t.text, margin: 0 }}>{sec.label}</p>
                  <p style={{ fontSize: 12, color: t.dim, margin: '2px 0 0' }}>{sec.desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            ))}
          </div>
          {activeSection && (
            <div className="editor-slide-in" style={{ position: 'absolute', inset: 0, background: t.bg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${t.separator}`, flexShrink: 0 }}>
                <button onClick={() => setActiveSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </button>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>{SECTIONS.find(s => s.id === activeSection)?.label}</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>{renderSection()}</div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
