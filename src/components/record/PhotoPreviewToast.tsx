'use client'
import { useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props {
  url: string
  onDismiss: () => void
}

export default function PhotoPreviewToast({ url, onDismiss }: Props) {
  const { t } = useI18n()
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [url, onDismiss])

  return (
    <div style={{
      position: 'absolute', bottom: 120, right: 16, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(10,10,20,0.90)', borderRadius: 14,
      padding: '8px 14px 8px 8px',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      animation: 'photo-toast-in 250ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes photo-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{t('record.photoToastAdded')}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>{t('record.photoToastSavedAtEnd')}</p>
      </div>
    </div>
  )
}
