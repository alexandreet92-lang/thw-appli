// Drapeau à damier « arrivée » (fin de course). Un seul dessin, réutilisé sur la
// carte (Leaflet divIcon), les vignettes et le profil d'altitude.

// Damier 3×4 (noir/blanc) sur un fond blanc, hampe sombre à gauche.
function checkerCells(): string {
  const cells: string[] = []
  const cols = 4, rows = 3, cw = 3.5, chh = 2.6, ox = 6, oy = 3
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) cells.push(`<rect x="${ox + c * cw}" y="${oy + r * chh}" width="${cw}" height="${chh}" fill="#111"/>`)
    }
  }
  return cells.join('')
}

const FLAG_INNER = `
  <line x1="5" y1="2" x2="5" y2="23" stroke="#111" stroke-width="2" stroke-linecap="round"/>
  <rect x="6" y="3" width="14" height="7.8" fill="#fff" stroke="#111" stroke-width="0.6"/>
  ${checkerCells()}
`

// HTML autonome pour un divIcon Leaflet (ancré sur le pied de la hampe).
export const FINISH_FLAG_HTML = `<svg width="24" height="24" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">${FLAG_INNER}</svg>`

// Composant à embarquer DANS un <svg> existant (vignette, profil) : placé à (x,y),
// le pied de la hampe posé sur le point.
export function FinishFlag({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x - 5 * size}, ${y - 23 * size}) scale(${size})`} style={{ pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: FLAG_INNER }} />
  )
}
