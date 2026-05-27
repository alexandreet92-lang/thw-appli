'use client'
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useTrailConfig } from '@/hooks/useTrailConfig'
import type { TrailSettings as TrailSettingsData } from '@/hooks/useTrailSettings'
import { trailFieldById } from '@/types/trail'
import type { DataPage } from '@/types/cycling'
import TrailSettingsNav from './TrailSettingsNav'
import CyclingSettingsTraining from './CyclingSettingsTraining'
import TrailSettingsParams from './TrailSettingsParams'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface Props { open: boolean; onClose: () => void; isDark: boolean; settings: TrailSettingsData; updateSetting: (path: string, value: unknown) => void }

const SECTION_ICONS: Record<string, ReactElement> = {
  pages:      (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>),
  navigation: (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="9" cy="9" r="2" fill="currentColor"/></svg>),
  training:   (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9h2M15 9h2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><rect x="3" y="6.5" width="2.5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="12.5" y="6.5" width="2.5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 9h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  alerts:     (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C5.5 2 3 5 3 8v4l-1.5 2h15L15 12V8c0-3-2.5-6-6-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  sensors:    (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 9a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>),
  display:    (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  athlete:    (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  recording:  (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="9" cy="9" r="3" fill="currentColor"/></svg>),
  units:      (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15L15 3M6 3h9v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  postrun:    (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>),
}

function getTheme(isDark: boolean) {
  return { bg: isDark?'#0A0A0A':'#FFFFFF', text: isDark?'#FFFFFF':'#0A0A0A', label: isDark?'rgba(255,255,255,0.55)':'#666', dim: isDark?'rgba(255,255,255,0.35)':'#8C8C8C', separator: isDark?'rgba(255,255,255,0.08)':'#E8E8E8', cardBg: isDark?'rgba(255,255,255,0.04)':'#FAFAFA' }
}

const SECTIONS = [
  { id:'pages',      label:'Pages de données',  desc:'Configurer les champs affichés' },
  { id:'navigation', label:'Navigation',         desc:'GPS, carte, détection montées' },
  { id:'training',   label:'Entraînement',       desc:'Lier une séance au planning' },
  { id:'alerts',     label:'Notifications',      desc:'Alertes et rappels' },
  { id:'sensors',    label:'Capteurs',           desc:'FC, cadence/foulée' },
  { id:'display',    label:'Affichage',          desc:'Thème, police, taille' },
  { id:'athlete',    label:'Profil athlète',     desc:'VMA, UTMB Index, allures cibles' },
  { id:'recording',  label:'Enregistrement',     desc:'GPS, auto-pause, auto-lap' },
  { id:'units',      label:'Unités & Mesures',   desc:'km/miles, allure' },
  { id:'postrun',    label:'Après la séance',    desc:'Upload Strava, résumé' },
]

export default function TrailSettings(props: Props) {
  if (!props.open) return null
  return <ToastProvider><TrailSettingsInner {...props} /></ToastProvider>
}

function TrailSettingsInner({ open, onClose, isDark, settings, updateSetting: updateSetting_prop }: Props) {
  const { showToast } = useToast()
  const t = getTheme(isDark)
  const { pages, savePages } = useTrailConfig('trail')
  const updateSetting = useCallback((path: string, value: unknown) => {
    updateSetting_prop(path, value)
    showToast('Modification enregistrée')
  }, [updateSetting_prop, showToast])
  const [closing, setClosing] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [closingSection, setClosingSection] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setClosing(false); setActiveSection(null); setClosingSection(false) } }, [open])
  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const openSection = (id: string) => { setActiveSection(id); setClosingSection(false) }
  const closeSection = () => { setClosingSection(true); setTimeout(() => { setActiveSection(null); setClosingSection(false) }, 230) }

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return
    const next = [...pages]; const [m] = next.splice(from, 1); next.splice(to, 0, m); void savePages(next)
  }
  const addNewPage = () => {
    const newPage: DataPage = { id:`trail_page_${Date.now()}`, name:`Page ${pages.length+1}`, type:'data', fields:['pace','duration','distance'] }
    void savePages([...pages, newPage])
  }
  const deletePage = (id: string) => { if (pages.length <= 1) return; void savePages(pages.filter((p: DataPage) => p.id !== id)) }
  const finishRename = (id: string, value: string) => {
    const trimmed = value.trim()
    if (trimmed) void savePages(pages.map((p: DataPage) => p.id === id ? { ...p, name: trimmed } : p))
    setRenamingId(null)
  }

  const renderPagesSection = () => (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 8px' }}>
        <span style={{ fontSize:11, fontWeight:700, color:t.dim, letterSpacing:'0.08em', textTransform:'uppercase' }}>Pages de données</span>
        <button onClick={addNewPage} style={{ fontSize:12, color:'#F59E0B', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Ajouter</button>
      </div>
      {(pages as DataPage[]).map((page, idx) => (
        <div key={page.id} style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:`1px solid ${t.separator}` }}>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <button onClick={() => movePage(idx, idx-1)} disabled={idx===0} aria-label="Monter" style={{ background:'none', border:'none', cursor:idx===0?'default':'pointer', opacity:idx===0?0.2:0.55, color:t.text, padding:'2px 4px' }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <button onClick={() => movePage(idx, idx+1)} disabled={idx===pages.length-1} aria-label="Descendre" style={{ background:'none', border:'none', cursor:idx===pages.length-1?'default':'pointer', opacity:idx===pages.length-1?0.2:0.55, color:t.text, padding:'2px 4px' }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#F59E0B' }}>{idx+1}</div>
            <div style={{ flex:1, minWidth:0 }}>
              {renamingId === page.id
                ? <input autoFocus defaultValue={page.name} onBlur={e => finishRename(page.id, e.target.value)} onKeyDown={e => { if (e.key==='Enter') finishRename(page.id, e.currentTarget.value); if (e.key==='Escape') setRenamingId(null) }} onClick={e => e.stopPropagation()} style={{ fontSize:15, fontWeight:600, background:'none', border:'none', borderBottom:'1px solid #F59E0B', color:t.text, outline:'none', width:'100%' }} />
                : <p style={{ fontSize:15, fontWeight:600, color:t.text, margin:0 }}>{page.name}</p>
              }
              <p style={{ fontSize:11, color:t.dim, margin:'2px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {page.type==='map' ? 'Carte + ' : ''}{page.fields.map((id: string) => trailFieldById(id)?.label).filter(Boolean).join(' · ')}
              </p>
            </div>
            <button onClick={e => { e.stopPropagation(); setMenuOpenId(prev => prev===page.id ? null : page.id) }} style={{ background:'none', border:'none', padding:'8px', color:'#8C8C8C', cursor:'pointer', fontSize:20, lineHeight:1 }}>⋯</button>
          </div>
          {menuOpenId === page.id && (
            <div ref={menuRef} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', zIndex:100, background:t.bg, border:`1px solid ${t.separator}`, borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', minWidth:150 }}>
              <button onClick={e => { e.stopPropagation(); setRenamingId(page.id); setMenuOpenId(null) }} style={{ width:'100%', padding:'13px 16px', background:'none', border:'none', textAlign:'left', fontSize:15, color:t.text, cursor:'pointer' }}>Renommer</button>
              <div style={{ height:1, background:t.separator }} />
              <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(page.id); setMenuOpenId(null) }} style={{ width:'100%', padding:'13px 16px', background:'none', border:'none', textAlign:'left', fontSize:15, color:'#EF4444', cursor:'pointer' }}>Supprimer</button>
            </div>
          )}
          {confirmDeleteId === page.id && (
            <div style={{ padding:'10px 16px', background:'rgba(239,68,68,0.08)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', margin:'4px 0' }}>
              <span style={{ fontSize:13, color:'#EF4444' }}>Supprimer cette page ?</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { deletePage(page.id); setConfirmDeleteId(null) }} style={{ padding:'5px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'white', fontSize:13, cursor:'pointer' }}>Oui</button>
                <button onClick={() => setConfirmDeleteId(null)} style={{ padding:'5px 14px', borderRadius:8, background:t.separator, border:'none', color:t.text, fontSize:13, cursor:'pointer' }}>Non</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderSectionContent = (id: string) => {
    if (id==='pages')      return renderPagesSection()
    if (id==='navigation') return <TrailSettingsNav settings={settings} updateSetting={updateSetting} theme={t} />
    if (id==='training')   return <CyclingSettingsTraining theme={t} />
    return <TrailSettingsParams settings={settings} updateSetting={updateSetting} theme={t} section={id} />
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={handleClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.50)', backdropFilter:'blur(4px)', animation: closing?'fade-out 200ms ease-in forwards':'fade-in 200ms ease-out forwards' }} />
      <div className={closing?'sheet-close':'sheet-open'} style={{ position:'fixed', left:0, right:0, bottom:0, height:'80vh', background:t.bg, color:t.text, borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'DM Sans, sans-serif', boxShadow:'0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}><div style={{ width:40, height:4, borderRadius:2, background:t.separator }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', flexShrink:0 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0, fontFamily:'Syne, sans-serif' }}>Réglages trail</h2>
          <button onClick={handleClose} aria-label="Fermer" style={{ color:t.dim, background:'none', border:'none', fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 8px' }}>×</button>
        </div>
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ height:'100%', overflowY:'auto', paddingBottom:24 }}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => openSection(sec.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'none', border:'none', cursor:'pointer', borderBottom:`1px solid ${t.separator}`, textAlign:'left', fontFamily:'DM Sans, sans-serif' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(245,158,11,0.10)', color:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{SECTION_ICONS[sec.id]}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:15, fontWeight:500, color:t.text, margin:0 }}>{sec.label}</p>
                  <p style={{ fontSize:12, color:'#8C8C8C', margin:'2px 0 0' }}>{sec.desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            ))}
          </div>
          {activeSection && (
            <div className={closingSection?'editor-slide-out':'editor-slide-in'} style={{ position:'absolute', inset:0, background:t.bg, zIndex:10, display:'flex', flexDirection:'column', overflowY:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:`1px solid ${t.separator}`, flexShrink:0 }}>
                <button onClick={closeSection} style={{ background:'none', border:'none', cursor:'pointer', color:t.text, padding:'4px' }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></button>
                <h3 style={{ fontSize:17, fontWeight:700, color:t.text, margin:0, flex:1, fontFamily:'Syne, sans-serif' }}>{SECTIONS.find(s=>s.id===activeSection)?.label}</h3>
              </div>
              <div style={{ flex:1, overflowY:'auto', paddingBottom:24 }}>{renderSectionContent(activeSection)}</div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
