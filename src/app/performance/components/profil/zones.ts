// Calculs de zones d'intensité pour l'onglet Profil. Couleurs de zone = tokens
// (fonctionnel). FC (Karvonen, 5), allure (depuis VMA, 5), puissance (Coggan, 7).

export interface Zone { z: string; label: string; color: string; pct: number; range: string }

const Z5 = ['var(--zone-1)', 'var(--zone-2)', 'var(--zone-3)', 'var(--zone-4)', 'var(--zone-5)']
const Z7 = ['var(--zone-1)', 'var(--zone-2)', 'var(--zone-2)', 'var(--zone-3)', 'var(--zone-4)', 'var(--zone-5)', 'var(--zone-5)']

const paceStr = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export function fcZones(hrMax: number, hrRest: number): Zone[] {
  const res = hrMax - hrRest
  const defs: [string, [number, number]][] = [
    ['Récupération', [0.50, 0.60]], ['Endurance', [0.60, 0.70]], ['Tempo', [0.70, 0.80]],
    ['Seuil', [0.80, 0.90]], ['VO2max', [0.90, 1.00]],
  ]
  return defs.map(([label, [a, b]], i) => {
    const low = Math.round(hrRest + res * a), high = Math.round(hrRest + res * b)
    return { z: `Z${i + 1}`, label, color: Z5[i], pct: hrMax > 0 ? (b * 100) : 0, range: hrMax > 0 ? `${low}–${high} bpm` : '—' }
  })
}

export function paceZones(vma: number): Zone[] {
  const defs: [string, number][] = [['Endurance', 0.68], ['Fondamental', 0.78], ['Tempo', 0.86], ['Seuil', 0.92], ['VMA', 1.0]]
  return defs.map(([label, f], i) => {
    const sec = vma > 0 ? 3600 / (vma * f) : 0
    return { z: `Z${i + 1}`, label, color: Z5[i], pct: f * 100, range: vma > 0 ? `${paceStr(sec)}/km` : '—' }
  })
}

export function powerZones(ftp: number): Zone[] {
  const defs: [string, number, number][] = [
    ['Récupération', 0, 0.55], ['Endurance', 0.56, 0.75], ['Tempo', 0.76, 0.90], ['Seuil', 0.91, 1.05],
    ['VO2max', 1.06, 1.20], ['Anaérobie', 1.21, 1.50], ['Neuromusculaire', 1.51, 2.0],
  ]
  return defs.map(([label, a, b], i) => {
    const low = Math.round(ftp * a), high = Math.round(ftp * b)
    const range = ftp > 0 ? (i === 6 ? `> ${low} W` : `${low}–${high} W`) : '—'
    return { z: `Z${i + 1}`, label, color: Z7[i], pct: Math.min(b / 1.5, 1) * 100, range }
  })
}
