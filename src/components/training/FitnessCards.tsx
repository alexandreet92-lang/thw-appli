'use client'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Info } from 'lucide-react'

interface FitnessCardsProps {
  ctl: number | null
  atl: number | null
  tsb: number | null
}

export function FitnessCards({ ctl, atl, tsb }: FitnessCardsProps) {
  const [openSheet, setOpenSheet] = useState<'CTL' | 'ATL' | 'TSB' | null>(null)

  return (
    <>
      {/* Titre de section */}
      <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 12px' }}>
          Fitness
        </p>

        {/* Les 3 cartes — flex row, aucune bordure sur le conteneur */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>

          {/* ═══ CARTE CTL ═══ */}
          <div style={{ flex: 1, borderRadius: 16, background: '#f1f5f9', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 96 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>CTL</span>
              <button type="button" onClick={() => setOpenSheet('CTL')} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>?</span>
              </button>
            </div>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#06B6D4', textAlign: 'center', lineHeight: 1, marginTop: 'auto' }}>
              {typeof ctl === 'number' ? ctl.toFixed(1) : '—'}
            </span>
          </div>

          {/* ═══ CARTE ATL ═══ */}
          <div style={{ flex: 1, borderRadius: 16, background: '#f1f5f9', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 96 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>ATL</span>
              <button type="button" onClick={() => setOpenSheet('ATL')} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>?</span>
              </button>
            </div>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#F97316', textAlign: 'center', lineHeight: 1, marginTop: 'auto' }}>
              {typeof atl === 'number' ? atl.toFixed(1) : '—'}
            </span>
          </div>

          {/* ═══ CARTE TSB ═══ */}
          <div style={{ flex: 1, borderRadius: 16, background: '#f1f5f9', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 96 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>TSB</span>
              <button type="button" onClick={() => setOpenSheet('TSB')} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', lineHeight: 1 }}>?</span>
              </button>
            </div>
            <span style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', lineHeight: 1, marginTop: 'auto', color: typeof tsb === 'number' && tsb < 0 ? '#EF4444' : '#10B981' }}>
              {typeof tsb === 'number' ? tsb.toFixed(1) : '—'}
            </span>
          </div>

        </div>
      </div>

      {/* BottomSheet CTL */}
      <BottomSheet
        isOpen={openSheet === 'CTL'}
        onClose={() => setOpenSheet(null)}
        title="CTL — Charge Chronique"
        icon={<Info size={16} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>Chronic Training Load sur <strong style={{ color: 'var(--foreground)' }}>42 jours</strong>.</p>
          <p style={{ margin: 0 }}>Mesure votre forme à long terme. C&apos;est la moyenne exponentielle de votre TSS quotidien sur 42 jours.</p>
          <p style={{ margin: 0 }}>Plus la valeur est élevée, meilleure est votre condition physique de base.</p>
          <div style={{ background: 'var(--muted)', borderRadius: 12, padding: 16, marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', margin: '0 0 8px' }}>Formule</p>
            <p style={{ margin: 0 }}>Moyenne exponentielle du TSS quotidien, constante de temps 42 jours.</p>
          </div>
        </div>
      </BottomSheet>

      {/* BottomSheet ATL */}
      <BottomSheet
        isOpen={openSheet === 'ATL'}
        onClose={() => setOpenSheet(null)}
        title="ATL — Charge Aiguë"
        icon={<Info size={16} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>Acute Training Load sur <strong style={{ color: 'var(--foreground)' }}>7 jours</strong>.</p>
          <p style={{ margin: 0 }}>Mesure la fatigue accumulée récemment. Calculée comme la moyenne exponentielle du TSS quotidien sur 7 jours.</p>
          <p style={{ margin: 0 }}>Plus la valeur est élevée, plus la fatigue récente est importante.</p>
          <div style={{ background: 'var(--muted)', borderRadius: 12, padding: 16, marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', margin: '0 0 8px' }}>Formule</p>
            <p style={{ margin: 0 }}>Moyenne exponentielle du TSS quotidien, constante de temps 7 jours.</p>
          </div>
        </div>
      </BottomSheet>

      {/* BottomSheet TSB */}
      <BottomSheet
        isOpen={openSheet === 'TSB'}
        onClose={() => setOpenSheet(null)}
        title="TSB — Forme du Moment"
        icon={<Info size={16} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong style={{ color: 'var(--foreground)' }}>TSB = CTL − ATL</strong></p>
          <p style={{ margin: 0 }}>Balance entre forme et fatigue.</p>
          <p style={{ margin: 0 }}><strong style={{ color: '#10B981' }}>&gt; 0</strong> : la forme dépasse la fatigue — bonne période pour performer.</p>
          <p style={{ margin: 0 }}><strong style={{ color: '#EF4444' }}>&lt; 0</strong> : la fatigue dépasse la forme — récupération conseillée.</p>
          <div style={{ background: 'var(--muted)', borderRadius: 12, padding: 16, marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', margin: '0 0 8px' }}>Zone idéale compétition</p>
            <p style={{ margin: 0 }}>Entre <strong style={{ color: 'var(--foreground)' }}>+5 et +25</strong>.</p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
