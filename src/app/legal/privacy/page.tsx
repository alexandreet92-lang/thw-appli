export const dynamic = 'force-dynamic'

const BG = 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 16px', fontFamily: 'Syne, sans-serif' }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
          La politique de confidentialité de Hybrid est en cours de rédaction.
          Elle sera disponible prochainement.
        </p>
      </div>
    </div>
  )
}
