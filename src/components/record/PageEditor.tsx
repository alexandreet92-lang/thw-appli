'use client'
import { useEffect, useState } from 'react'
import { MAX_FIELDS, type DataPage } from '@/types/cycling'
import FieldPicker from './FieldPicker'
import PagePreview from './PagePreview'
import { ToastProvider, useToast } from '@/components/ui/Toast'

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
    dim:       isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    cardBg:    isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
  }
}

const ACCENT = '#06B6D4'

export default function PageEditor(props: Props) {
  if (!props.open || !props.page) return null
  return (
    <ToastProvider>
      <PageEditorInner {...props} />
    </ToastProvider>
  )
}

function PageEditorInner({ page: initial, onClose, onSave, isDark }: Props) {
  const t = getTheme(isDark)
  const { showToast } = useToast()
  const [closing, setClosing] = useState(false)
  const [page, setPage] = useState<DataPage>(initial!)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [replacingFieldId, setReplacingFieldId] = useState<string | null>(null)

  useEffect(() => { if (initial) setPage(initial) }, [initial])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const isMap = page.type === 'map'
  const maxForPage = isMap ? 2 : MAX_FIELDS

  const updatePage = (next: DataPage) => setPage(next)
  const setBigPosition = (pos: 'top' | 'middle') => updatePage({ ...page, bigFieldPosition: pos })

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
    updatePage(next)
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
    updatePage({ ...page, fields: newFields, bigFieldId: newBig })
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
      updatePage({ ...page, fields: newFields, bigFieldId: newBig })
      showToast('Champ remplacé')
    } else {
      if (page.fields.length >= maxForPage) return
      updatePage({ ...page, fields: [...page.fields, newFid] })
      showToast('Champ ajouté')
    }
    setPickerOpen(false)
    setReplacingFieldId(null)
  }

  const handleSave = () => { onSave(page); showToast('Page sauvegardée') }

  return (
    <div
      className={closing ? 'editor-slide-out' : 'editor-slide-in'}
      style={{
        position: 'fixed', inset: 0, zIndex: 10004,
        background: t.bg, color: t.text,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'DM Sans, sans-serif',
        paddingTop: 'env(safe-area-inset-top)',
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
          onChange={e => updatePage({ ...page, name: e.target.value })}
          maxLength={24}
          style={{
            fontSize: 18, fontWeight: 700, background: 'none', border: 'none',
            borderBottom: `1px solid ${t.separator}`, color: t.text,
            flex: 1, outline: 'none', padding: '2px 4px', fontFamily: 'Syne, sans-serif',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn label="−" onClick={removeLastField} disabled={page.fields.length <= 1}
            color="#EF4444" bg="rgba(239,68,68,0.15)" t={t}/>
          <IconBtn label="+" onClick={addFieldSlot} disabled={page.fields.length >= maxForPage}
            color={ACCENT} bg="rgba(6,182,212,0.15)" t={t}/>
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
                  border: `1px solid ${active ? ACCENT : t.separator}`,
                  color: active ? ACCENT : t.dim, cursor: 'pointer',
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
        background: t.bg, height: 280, position: 'relative', flexShrink: 0,
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

      {/* Sauvegarder sticky */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${t.separator}`,
        background: t.bg, paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}>
        <button onClick={handleSave}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            color: '#fff', fontSize: 15, fontWeight: 600,
            fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em',
          }}>
          Sauvegarder
        </button>
      </div>

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

function IconBtn({ label, onClick, disabled, color, bg, t }: {
  label: string; onClick: () => void; disabled?: boolean
  color: string; bg: string; t: ReturnType<typeof getTheme>
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 8,
        background: disabled ? t.cardBg : bg,
        border: 'none', color: disabled ? t.dim : color,
        fontSize: 20, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
      {label}
    </button>
  )
}
