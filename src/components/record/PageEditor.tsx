'use client'
import { useEffect, useState } from 'react'
import { ALL_FIELDS, fieldById, maxFieldsForType, type DataPage } from '@/types/cycling'

interface Props {
  open: boolean
  page: DataPage | null
  onClose: () => void
  onSave: (updated: DataPage) => void
  isDark: boolean
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    dim:       isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    cardBg:    isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
  }
}

const ACCENT = '#06B6D4'

export default function PageEditor({ open, page, onClose, onSave, isDark }: Props) {
  const t = getTheme(isDark)
  const [closing, setClosing] = useState(false)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<string[]>([])

  useEffect(() => {
    if (page) { setName(page.name); setFields(page.fields) }
  }, [page])
  useEffect(() => { if (open) setClosing(false) }, [open])

  if (!open || !page) return null
  const maxFields = maxFieldsForType(page.type)
  const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }
  const handleSave = () => onSave({ ...page, name: name.trim() || page.name, fields })

  const moveField = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= fields.length) return
    const next = [...fields]
    const [moved] = next.splice(idx, 1)
    next.splice(j, 0, moved)
    setFields(next)
  }
  const removeField = (id: string) => setFields(fields.filter(f => f !== id))
  const addField = (id: string) => {
    if (fields.length >= maxFields) return
    setFields([...fields, id])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
        animation: closing ? 'fade-out 200ms ease-in forwards' : 'fade-in 200ms ease-out forwards',
      }}/>
      <div
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          height: '85vh',
          background: t.bg, color: t.text,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
          <button onClick={handleClose} aria-label="Retour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text, flex: 1, margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Modifier la page
          </h3>
          {page.type === 'map' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(6,182,212,0.15)', color: ACCENT,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>Page carte</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Nom */}
          <div style={{ padding: '0 20px 16px' }}>
            <label style={{ fontSize: 11, color: t.dim, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Nom de la page
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              placeholder="Ex: Données principales"
              style={{
                display: 'block', width: '100%', marginTop: 8,
                background: t.cardBg, border: `1px solid ${t.separator}`,
                borderRadius: 10, padding: '10px 14px', fontSize: 15,
                color: t.text, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Champs sélectionnés */}
          <div style={{ padding: '0 20px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: t.dim, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Champs ({fields.length}/{maxFields})
              </label>
              <span style={{ fontSize: 11, color: ACCENT }}>
                {fields.length < maxFields
                  ? `${maxFields - fields.length} disponible${maxFields - fields.length > 1 ? 's' : ''}`
                  : 'Maximum atteint'}
              </span>
            </div>
            {fields.map((fid, idx) => {
              const f = fieldById(fid)
              if (!f) return null
              return (
                <div key={fid} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 0', borderBottom: `1px solid ${t.separator}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(6,182,212,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: ACCENT,
                  }}>{idx + 1}</div>
                  <span style={{ flex: 1, fontSize: 14, color: t.text }}>
                    {f.label}
                    {f.unit && <span style={{ color: t.dim, fontSize: 12 }}> · {f.unit}</span>}
                    {f.requiresSensor && (
                      <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)', marginLeft: 6 }}>capteur</span>
                    )}
                  </span>
                  <button onClick={() => moveField(idx, -1)} disabled={idx === 0}
                    aria-label="Monter"
                    style={{ background: 'none', border: 'none', cursor: idx===0?'default':'pointer',
                             opacity: idx===0?0.2:0.6, color: t.text, padding: 4, fontSize: 14 }}>↑</button>
                  <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                    aria-label="Descendre"
                    style={{ background: 'none', border: 'none', cursor: idx===fields.length-1?'default':'pointer',
                             opacity: idx===fields.length-1?0.2:0.6, color: t.text, padding: 4, fontSize: 14 }}>↓</button>
                  <button onClick={() => removeField(fid)} aria-label="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                             color: 'rgba(239,68,68,0.7)', padding: 4, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              )
            })}
          </div>

          {/* Ajouter un champ */}
          {fields.length < maxFields && (
            <div style={{ padding: '12px 20px 20px' }}>
              <p style={{ fontSize: 11, color: t.dim, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ajouter un champ
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_FIELDS.filter(f => !fields.includes(f.id)).map(f => (
                  <button key={f.id} onClick={() => addField(f.id)}
                    style={{
                      padding: '7px 12px', borderRadius: 20,
                      background: 'rgba(6,182,212,0.10)',
                      border: '1px solid rgba(6,182,212,0.30)',
                      color: ACCENT, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}>
                    + {f.label}{f.requiresSensor && <span style={{ fontSize: 10, opacity: 0.7 }}> ⚡</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sauvegarder sticky bottom */}
        <div style={{
          padding: '12px 20px 20px', borderTop: `1px solid ${t.separator}`,
          background: t.bg, paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}>
          <button onClick={handleSave}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em',
            }}>
            Sauvegarder
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  )
}
