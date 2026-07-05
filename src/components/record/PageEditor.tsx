'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_FIELDS, type DataPage } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
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
  const theme = getTheme(isDark)
  const t = theme
  const { t: tr } = useI18n()
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
        showToast(tr('record.pageEditorToastSaved'))
      } catch (e) {
        console.error('[PageEditor] autoSave error:', e)
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [onPageUpdated, showToast, tr])

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
    showToast(tr('record.pageEditorFieldRemoved'))
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
    showToast(tr('record.pageEditorPositionsSwapped'))
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
      showToast(tr('record.pageEditorFieldReplaced'))
    } else {
      if (page.fields.length >= maxForPage) return
      applyUpdate({ ...page, fields: [...page.fields, newFid] })
      showToast(tr('record.pageEditorFieldAdded'))
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${t.separator}`, flexShrink: 0 }}>
        <button onClick={handleClose} aria-label={tr('record.pageEditorBack')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, padding: 4, flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        <input
          value={page.name}
          onChange={e => updateName(e.target.value)}
          maxLength={24}
          style={{
            flex: 1, fontSize: 17, fontWeight: 700, background: 'none', border: 'none',
            borderBottom: `1px solid ${t.separator}`, color: t.text,
            outline: 'none', padding: '2px 4px', fontFamily: 'Syne, sans-serif', minWidth: 0,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {saving && (
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              border: '2px solid rgba(6,182,212,0.25)',
              borderTopColor: '#06B6D4',
              animation: 'spin 0.7s linear infinite',
            }} />
          )}
          <button
            onClick={removeLastField}
            disabled={page.fields.length <= 1}
            style={{
              width: 32, height: 32, borderRadius: 8, padding: 0,
              background: page.fields.length <= 1 ? t.cardBg : 'rgba(239,68,68,0.12)',
              border: `1.5px solid ${page.fields.length <= 1 ? t.separator : 'rgba(239,68,68,0.3)'}`,
              color: page.fields.length <= 1 ? t.dim : '#EF4444',
              cursor: page.fields.length <= 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
          >
            <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
              <path d="M1 1h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 12, color: t.dim, minWidth: 32, textAlign: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{page.fields.length}</span>/{maxForPage}
          </span>
          <button
            onClick={addFieldSlot}
            disabled={page.fields.length >= maxForPage}
            style={{
              width: 32, height: 32, borderRadius: 8, padding: 0,
              background: page.fields.length >= maxForPage ? t.cardBg : 'rgba(6,182,212,0.12)',
              border: `1.5px solid ${page.fields.length >= maxForPage ? t.separator : 'rgba(6,182,212,0.35)'}`,
              color: page.fields.length >= maxForPage ? t.dim : '#06B6D4',
              cursor: page.fields.length >= maxForPage ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                {pos === 'top' ? tr('record.pageEditorBigFieldTop') : tr('record.pageEditorBigFieldMiddle')}
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
        }}>{tr('record.pageEditorPreview')}</div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: t.dim, padding: '10px 16px', margin: 0 }}>
        {selectedField
          ? tr('record.pageEditorHintSwap')
          : tr('record.pageEditorHintSelect')}
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

