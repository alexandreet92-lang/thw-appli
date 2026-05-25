'use client'
import { useEffect, useRef, useState } from 'react'
import { useCyclingConfig } from '@/hooks/useCyclingConfig'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { fieldById, type DataPage } from '@/types/cycling'
import PageEditor from './PageEditor'
import CyclingSettingsNav from './CyclingSettingsNav'
import CyclingSettingsTraining from './CyclingSettingsTraining'
import CyclingSettingsParams from './CyclingSettingsParams'

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

const SECTIONS = [
  { id: 'pages',      label: 'Pages de données',  desc: 'Configurer les champs affichés' },
  { id: 'navigation', label: 'Navigation',         desc: 'GPS, carte, détection montées' },
  { id: 'training',   label: 'Entraînement',       desc: 'Lier une séance au planning' },
  { id: 'alerts',     label: 'Notifications',      desc: 'Alertes et rappels' },
  { id: 'sensors',    label: 'Capteurs',           desc: 'FC, puissance, cadence' },
  { id: 'display',    label: 'Affichage',          desc: 'Thème, police, taille' },
  { id: 'athlete',    label: 'Profil athlète',     desc: 'FTP, FC max, zones' },
  { id: 'recording',  label: 'Enregistrement',     desc: 'GPS, auto-pause, auto-lap' },
  { id: 'units',      label: 'Unités & Mesures',   desc: 'km/miles, °C/°F' },
  { id: 'postride',   label: 'Après la séance',    desc: 'Upload Strava, résumé' },
]

export default function CyclingSettings({ open, onClose, isDark }: Props) {
  const t = getTheme(isDark)
  const { pages, setPages, savePages } = useCyclingConfig()
  const { settings, updateSetting } = useCyclingSettings()
  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState<DataPage | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [closingSection, setClosingSection] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setClosing(false); setActiveSection(null); setClosingSection(false) } }, [open])

  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  if (!open) return null

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }

  const openSection = (id: string) => { setActiveSection(id); setClosingSection(false) }
  const closeSection = () => {
    setClosingSection(true)
    setTimeout(() => { setActiveSection(null); setClosingSection(false) }, 230)
  }

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
  const handlePageUpdated = (updated: DataPage) => {
    setPages(prev => prev.map(p => p.id === updated.id ? updated : p))
  }
  const startRename = (page: DataPage) => { setRenamingId(page.id) }
  const finishRename = (id: string, value: string) => {
    const trimmed = value.trim()
    if (trimmed) void savePages(pages.map(p => p.id === id ? { ...p, name: trimmed } : p))
    setRenamingId(null)
  }

  const renderPagesSection = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pages de données</span>
        <button onClick={addNewPage} style={{ fontSize: 12, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Ajouter</button>
      </div>
      {pages.map((page, idx) => (
        <div key={page.id} style={{ position: 'relative' }}>
          <div onClick={() => setEditing(page)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${t.separator}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={e => { e.stopPropagation(); movePage(idx, idx - 1) }} disabled={idx === 0} aria-label="Monter"
                style={{ background: 'none', border: 'none', cursor: idx===0?'default':'pointer', opacity: idx===0?0.2:0.55, color: t.text, padding: '2px 4px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={e => { e.stopPropagation(); movePage(idx, idx + 1) }} disabled={idx === pages.length - 1} aria-label="Descendre"
                style={{ background: 'none', border: 'none', cursor: idx===pages.length-1?'default':'pointer', opacity: idx===pages.length-1?0.2:0.55, color: t.text, padding: '2px 4px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#06B6D4' }}>{idx + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {renamingId === page.id ? (
                <input autoFocus defaultValue={page.name}
                  onBlur={e => finishRename(page.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(page.id, e.currentTarget.value); if (e.key === 'Escape') setRenamingId(null) }}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 15, fontWeight: 600, background: 'none', border: 'none', borderBottom: '1px solid #06B6D4', color: t.text, outline: 'none', flex: 1, padding: '2px 4px', width: '100%' }} />
              ) : (
                <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{page.name}</p>
              )}
              <p style={{ fontSize: 11, color: t.dim, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {page.type === 'map' ? 'Carte + ' : ''}
                {page.fields.map(id => fieldById(id)?.label).filter(Boolean).join(' · ')}
              </p>
            </div>
            <button onClick={e => { e.stopPropagation(); setMenuOpenId(prev => prev === page.id ? null : page.id) }}
              style={{ background: 'none', border: 'none', padding: '8px', color: '#8C8C8C', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⋯</button>
          </div>

          {menuOpenId === page.id && (
            <div ref={menuRef} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 100, background: t.bg, border: `1px solid ${t.separator}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 150 }}>
              <button onClick={e => { e.stopPropagation(); startRename(page); setMenuOpenId(null) }}
                style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 15, color: t.text, cursor: 'pointer' }}>Renommer</button>
              <div style={{ height: 1, background: t.separator }} />
              <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(page.id); setMenuOpenId(null) }}
                style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 15, color: '#EF4444', cursor: 'pointer' }}>Supprimer</button>
            </div>
          )}

          {confirmDeleteId === page.id && (
            <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#EF4444' }}>Supprimer cette page ?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { deletePage(page.id); setConfirmDeleteId(null) }}
                  style={{ padding: '5px 14px', borderRadius: 8, background: '#EF4444', border: 'none', color: 'white', fontSize: 13, cursor: 'pointer' }}>Oui</button>
                <button onClick={() => setConfirmDeleteId(null)}
                  style={{ padding: '5px 14px', borderRadius: 8, background: t.separator, border: 'none', color: t.text, fontSize: 13, cursor: 'pointer' }}>Non</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderSectionContent = (id: string) => {
    if (id === 'pages')      return renderPagesSection()
    if (id === 'navigation') return <CyclingSettingsNav settings={settings} updateSetting={updateSetting} theme={t} />
    if (id === 'training')   return <CyclingSettingsTraining theme={t} />
    return <CyclingSettingsParams settings={settings} updateSetting={updateSetting} theme={t} section={id} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
        animation: closing ? 'fade-out 200ms ease-in forwards' : 'fade-in 200ms ease-out forwards',
      }} />
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
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.separator }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>Réglages vélo</h2>
          <button onClick={handleClose} aria-label="Fermer"
            style={{ color: t.dim, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        {/* Section tiles + sub-page (relative container) */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Main tiles list */}
          <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 24 }}>
            {SECTIONS.map((sec, i) => (
              <button
                key={sec.id}
                onClick={() => openSection(sec.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', background: 'none', border: 'none',
                  cursor: 'pointer', borderBottom: `1px solid ${t.separator}`,
                  textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(6,182,212,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 17,
                }}>
                  {['📄','🗺','🏋️','🔔','📡','☀️','👤','⏺','📏','🏁'][i]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: t.text, margin: 0 }}>{sec.label}</p>
                  <p style={{ fontSize: 12, color: '#8C8C8C', margin: '2px 0 0' }}>{sec.desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Sub-page (slides from right) */}
          {activeSection && (
            <div
              className={closingSection ? 'editor-slide-out' : 'editor-slide-in'}
              style={{
                position: 'absolute', inset: 0,
                background: t.bg, zIndex: 10,
                display: 'flex', flexDirection: 'column',
                overflowY: 'hidden',
              }}
            >
              {/* Sub-page header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: `1px solid ${t.separator}`,
                flexShrink: 0,
              }}>
                <button onClick={closeSection}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text, margin: 0, flex: 1, fontFamily: 'Syne, sans-serif' }}>
                  {SECTIONS.find(s => s.id === activeSection)?.label}
                </h3>
              </div>

              {/* Sub-page content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                {renderSectionContent(activeSection)}
              </div>
            </div>
          )}
        </div>
      </div>

      <PageEditor
        open={!!editing}
        page={editing}
        allPages={pages}
        onPageUpdated={handlePageUpdated}
        onClose={() => setEditing(null)}
        isDark={isDark}
      />

      <style>{`
        @keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  )
}
