'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_FIELDS, type DataPage } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import FieldPicker from './FieldPicker'
import PagePreview from './PagePreview'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface Props {
  open: boolean
  page: DataPage | null
  allPages: DataPage[]
  onPageUpdated: (updated: DataPage) => void
  onClose: () => void
  isDark: boolean
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    dim:       isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    cardBg:    isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
  }
}

export default function PageEditor(props: Props) {
  if (!props.open || !props.page) return null
  return (
    <ToastProvider>
      <PageEditorInner {...props} />
    </ToastProvider>
  )
}

function PageEditorInner({ page: initial, allPages, onPageUpdated, onClose, isDark }: Props) {
  const t = getTheme(isDark)
  const { showToast } = useToast()
  const [closing, setClosing] = useState(false)
  const [page, setPage] = useState<DataPage>(initial!)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [replacingFieldId, setReplacingFieldId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allPagesRef = useRef(allPages)
  useEffect(() => { allPagesRef.current = allPages }, [allPages])

  useEffect(() => { if (initial) setPage(initial) }, [initial])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const isMap = page.type === 'map'
  const maxForPage = isMap ? 2 : MAX_FIELDS

  const autoSave = useCallback((updated: DataPage) => {
    onPageUpdated(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const newPages = allPagesRef.current.map(p => p.id === updated.id ? updated : p)
        await sb.from('sport_page_configs').upsert(
          { user_id: user.id, sport: 'cycling', pages: newPages },
          { onConflict: 'user_id,sport' }
        )
        showToast('Modifications enregistrées')
      } catch (e) {
        console.error('[PageEditor] autoSave error:', e)
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [onPageUpdated, showToast])

  const applyUpdate = useCallback((updated: DataPage) => {
    setPage(updated)
    autoSave(updated)
  }, [autoSave])

  const setBigPosition = (pos: 'top' | 'middle') => applyUpdate({ ...page, bigFieldPosition: pos })
  const updateName = (name: string) => applyUpdate({ ...page, name })

  const addFieldSlot = () => {
    if (page.fields.length >= maxForPage) return
    setReplacingFieldId(null)
    setPickerOpen(true)
  }
  const removeLastField = () => {
    if (page.fields.length <= 1) return
    const last = page.fields[page.fields.length - 1]
    const next = { ...page, fields: page.fields.slice(0, -1) }
    if (page.bigFieldId === last) next.bigFieldId = next.fields[0]
    applyUpdate(next)
    showToast('Champ supprimé')
  }

  const handleFieldClick = (fid: string) => {
    if (!selectedField) { setSelectedField(fid); return }
    if (selectedField === fid) { setSelectedField(null); return }
    const newFields = [...page.fields]
    const ia = newFields.indexOf(selectedField)
    const ib = newFields.indexOf(fid)
    if (ia < 0 || ib < 0) { setSelectedField(null); return }
    ;[newFields[ia], newFields[ib]] = [newFields[ib], newFields[ia]]
    let newBig = page.bigFieldId
    if (page.bigFieldId === selectedField) newBig = fid
    else if (page.bigFieldId === fid) newBig = selectedField
    applyUpdate({ ...page, fields: newFields, bigFieldId: newBig })
    setSelectedField(null)
    showToast('Positions échangées')
  }
  const handleFieldDoubleClick = (fid: string) => {
    setReplacingFieldId(fid)
    setSelectedField(null)
    setPickerOpen(true)
  }

  const handlePickerSelect = (newFid: string) => {
    if (replacingFieldId) {
      const newFields = page.fields.map(f => f === replacingFieldId ? newFid : f)
      const newBig = page.bigFieldId === replacingFieldId ? newFid : page.bigFieldId
      applyUpdate({ ...page, fields: newFields, bigFieldId: newBig })
      showToast('Champ remplacé')
    } else {
      if (page.fields.length >= maxForPage) return
      applyUpdate({ ...page, fields: [...page.fields, newFid] })
      showToast('Champ ajouté')
    }
    setPickerOpen(false)
    setReplacingFieldId(null)
  }

  return (
    <div
      className={closing ? 'editor-slide-out' : 'editor-slide-in'}
      style={{
        position: 'fixed', inset: 0, zIndex: 10004,
        background: t.bg, color: t.text,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'DM Sans, sans-serif',
        paddingTop: 'env(safe-area-inset-top)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', gap: 12 }}>
        <button onClick={handleClose} aria-label="Retour"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 5l-7 6 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <input
          value={page.name}
          onChange={e => updateName(e.target.value)}
          maxLength={24}
          style={{
            fontSize: 18, fontWeight: 700, background: 'none', border: 'none',
            borderBottom: `1px solid ${t.separator}`, color: t.text,
            flex: 1, outline: 'none', padding: '2px 4px', fontFamily: 'Syne, sans-serif',
          }}
        />
        {saving && (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(6,182,212,0.25)',
            borderTopColor: '#06B6D4',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={removeLastField}
            disabled={page.fields.length <= 1}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: page.fields.length <= 1 ? 'rgba(0,0,0,0.05)' : 'rgba(239,68,68,0.12)',
              border: `1.5px solid ${page.fields.length <= 1 ? 'rgba(0,0,0,0.1)' : 'rgba(239,68,68,0.3)'}`,
              color: page.fields.length <= 1 ? '#CCC' : '#EF4444',
              cursor: page.fields.length <= 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
          >
            <svg width="14" height="2" viewBox="0 0 14 2" fill="none">
              <path d="M1 1h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div style={{ fontSize: 12, fontWeight: 600, minWidth: 48, textAlign: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 15, color: t.text }}>{page.fields.length}</span>
            <span style={{ fontSize: 11, color: t.dim }}>/{maxForPage}</span>
          </div>
          <button
            onClick={addFieldSlot}
            disabled={page.fields.length >= maxForPage}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: page.fields.length >= maxForPage ? 'rgba(0,0,0,0.05)' : 'rgba(6,182,212,0.12)',
              border: `1.5px solid ${page.fields.length >= maxForPage ? 'rgba(0,0,0,0.1)' : 'rgba(6,182,212,0.35)'}`,
              color: page.fields.length >= maxForPage ? '#CCC' : '#06B6D4',
              cursor: page.fields.length >= maxForPage ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Position grand champ */}
      {!isMap && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px' }}>
          {(['top', 'middle'] as const).map(pos => {
            const active = (page.bigFieldPosition ?? 'top') === pos
            return (
              <button key={pos} onClick={() => setBigPosition(pos)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: active ? 'rgba(6,182,212,0.20)' : 'transparent',
                  border: `1px solid ${active ? '#06B6D4' : t.separator}`,
                  color: active ? '#06B6D4' : t.dim, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                {pos === 'top' ? 'Grand champ en haut' : 'Grand champ au centre'}
              </button>
            )
          })}
        </div>
      )}

      {/* Aperçu */}
      <div style={{
        margin: '0 16px', border: `1px solid ${t.separator}`, borderRadius: 16, overflow: 'hidden',
        background: t.bg, minHeight: 320, position: 'relative', flexShrink: 0,
      }}>
        <PagePreview
          page={page} theme={t}
          selectedField={selectedField}
          onFieldClick={handleFieldClick}
          onFieldDoubleClick={handleFieldDoubleClick}
        />
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.50)', borderRadius: 6,
          padding: '2px 8px', fontSize: 10, color: '#fff', letterSpacing: '0.04em',
        }}>Aperçu</div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: t.dim, padding: '10px 16px', margin: 0 }}>
        {selectedField
          ? 'Appuyez sur un autre champ pour échanger les positions'
          : 'Appuyez pour sélectionner · Double-tap pour remplacer'}
      </p>

      <div style={{ flex: 1, minHeight: 0 }} />

      <FieldPicker
        open={pickerOpen}
        excludeIds={page.fields}
        onClose={() => { setPickerOpen(false); setReplacingFieldId(null) }}
        onSelect={handlePickerSelect}
        theme={t}
      />
    </div>
  )
}

