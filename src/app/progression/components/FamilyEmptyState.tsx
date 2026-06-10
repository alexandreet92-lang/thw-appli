'use client'

// État vide contextuel pour les familles « structurées » (VMA/Seuil/FTP/…)
// non encore détectables (cf. RAPPORT_PROGRESSION_AUDIT.md).
const MESSAGES: Record<string, string> = {
  vma: "Les séances VMA nécessitent des intervalles courts (< 2 min) à haute intensité, classifiés par type d'effort.",
  seuil: "Le suivi Seuil nécessite des blocs longs (8-20 min) à intensité élevée, classifiés par type d'effort.",
  ftp: "Le suivi FTP nécessite des séances structurées (intervalles 5-20 min à 88-105% FTP) et ton FTP renseigné.",
  pma: "Le suivi PMA nécessite des intervalles 3-8 min à haute intensité.",
  anaerobie: "Le suivi Anaérobie nécessite des intervalles courts (30s-2min) à très haute intensité.",
  sprints: "Le suivi Sprints nécessite des efforts ≤ 30s à puissance maximale.",
  squat: "Le suivi 1RM Squat nécessite l'enregistrement structuré des exercices et séries.",
  developpe_couche: "Le suivi 1RM Développé couché nécessite l'enregistrement structuré des séries.",
  deadlift: "Le suivi 1RM Deadlift nécessite l'enregistrement structuré des séries.",
  traction: "Le suivi Traction nécessite l'enregistrement structuré des séries.",
  dips: "Le suivi Dips nécessite l'enregistrement structuré des séries.",
  developpe_militaire: "Le suivi 1RM Développé militaire nécessite l'enregistrement structuré des séries.",
  front_squat: "Le suivi Front squat nécessite l'enregistrement structuré des séries.",
  css: "Le suivi CSS nécessite des tests critiques structurés (200m + 400m all-out).",
  test_400m: "Le suivi 400m test nécessite des tests all-out classifiés.",
  endurance: "Le suivi Endurance longue nécessite des séances continues > 30 min en Z2 classifiées.",
}

export function FamilyEmptyState({ family, label }: { family: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12, opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>{label} bientôt disponible</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 420, margin: '0 auto 10px' }}>{MESSAGES[family] ?? 'Cette famille nécessite des séances structurées.'}</p>
      <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>En attendant, consulte l&apos;onglet <strong>Général</strong> pour tes tendances globales.</p>
    </div>
  )
}
