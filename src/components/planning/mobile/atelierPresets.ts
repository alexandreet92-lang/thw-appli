// ══════════════════════════════════════════════════════════════════
// Catalogue d'ateliers d'AGILITÉ (famille course « Intervals Strides »).
// 27 ateliers avec diagramme de cônes (SVG inline). Les diagrammes utilisent
// `currentColor` : la teinte est fournie au rendu (accent), aucune couleur en
// dur → conforme au gate de couleurs. viewBox 120×60.
// ══════════════════════════════════════════════════════════════════
export interface AtelierPreset { id: string; name: string; desc: string; zone: number; svg: string }

// Helpers de diagramme.
const co = (x: number, y: number) => `<polygon points="${x},${y - 5} ${x - 4},${y + 4} ${x + 4},${y + 4}" fill="currentColor"/>`
const ar = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"'
const dash = 'stroke="currentColor" stroke-opacity="0.4" stroke-width="1.8" fill="none" stroke-dasharray="3 4" stroke-linecap="round"'
const mut = 'stroke="currentColor" stroke-opacity="0.4"'
const line = (x1: number, y1: number, x2: number, y2: number, s = ar) => `<path d="M${x1},${y1} L${x2},${y2}" ${s}/>`
const dot = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="3.5" fill="currentColor"/>`

export const ATELIER_PRESETS: AtelierPreset[] = [
  { id: 'navette_5_10_5', name: 'Navette 5-10-5', desc: 'Pro agility · 3 plots', zone: 4, svg: co(20, 30) + co(60, 30) + co(100, 30) + line(60, 44, 20, 44) + line(60, 52, 100, 52) },
  { id: 't_drill', name: 'T-Drill', desc: 'Avant · latéral · arrière', zone: 4, svg: co(60, 50) + co(20, 16) + co(60, 16) + co(100, 16) + line(60, 46, 60, 20) + line(60, 16, 24, 16) + line(60, 16, 96, 16) },
  { id: 'l_drill', name: 'L-Drill (3 cônes)', desc: 'Parcours en L', zone: 4, svg: co(28, 46) + co(28, 16) + co(92, 16) + line(28, 42, 28, 20) + line(28, 16, 86, 16) },
  { id: 'slalom', name: 'Slalom / zig-zag', desc: 'Appuis serrés', zone: 3, svg: co(14, 20) + co(40, 40) + co(66, 20) + co(92, 40) + co(112, 20) + `<path d="M14,26 Q40,46 66,26 T112,26" ${ar}/>` },
  { id: 'box_drill', name: 'Box drill', desc: 'Carré 5×5 m', zone: 4, svg: co(30, 16) + co(90, 16) + co(90, 46) + co(30, 46) + `<path d="M30,16 L90,16 L90,46 L30,46 Z" ${ar}/>` },
  { id: 'etoile', name: 'Étoile', desc: 'Retours au centre', zone: 4, svg: co(60, 30) + co(20, 12) + co(100, 12) + co(20, 48) + co(100, 48) + line(60, 30, 24, 14) + line(60, 30, 96, 14) + line(60, 30, 24, 46) + line(60, 30, 96, 46) },
  { id: 'compas', name: 'Compas (8 dir.)', desc: 'Boussole · retours centre', zone: 5, svg: co(60, 30) + [[60, 10], [95, 16], [100, 30], [95, 44], [60, 50], [25, 44], [20, 30], [25, 16]].map(p => line(60, 30, p[0], p[1], dash)).join('') },
  { id: 'illinois', name: 'Illinois', desc: 'Parcours complet réf.', zone: 5, svg: co(12, 12) + co(12, 48) + co(108, 12) + co(108, 48) + co(48, 12) + co(48, 48) + co(72, 12) + co(72, 48) + `<path d="M12,48 L12,12 M12,48 Q60,30 108,48 M108,48 L108,12" ${ar}/>` },
  { id: '505', name: '505', desc: 'Demi-tour 180°', zone: 5, svg: co(30, 30) + co(100, 30) + line(30, 26, 100, 26) + `<path d="M100,26 a6,7 0 0 1 0,10" ${ar}/>` + line(100, 36, 30, 36) },
  { id: 'hexagone', name: 'Hexagone', desc: 'Sauts entrée/sortie', zone: 4, svg: `<polygon points="60,12 88,26 88,42 60,52 32,42 32,26" fill="none" ${mut} stroke-width="1.6"/>` + [[60, 6], [94, 22], [94, 46], [60, 58], [26, 46], [26, 22]].map(p => line(60, 30, p[0], p[1], dash)).join('') },
  { id: 'araignee', name: 'Araignée (spider)', desc: '5 plots en éventail', zone: 4, svg: co(60, 52) + co(16, 18) + co(46, 12) + co(74, 12) + co(104, 18) + line(60, 48, 18, 22) + line(60, 48, 46, 16) + line(60, 48, 74, 16) + line(60, 48, 102, 22) },
  { id: 'figure_8', name: 'Figure en 8', desc: 'Huit autour de 2 plots', zone: 3, svg: co(40, 30) + co(80, 30) + `<path d="M40,30 C40,14 80,14 80,30 C80,46 40,46 40,30 Z" ${ar}/>` },
  { id: 'w_drill', name: 'W-Drill', desc: 'Avant-arrière en W', zone: 4, svg: co(14, 46) + co(38, 16) + co(60, 46) + co(82, 16) + co(106, 46) + `<path d="M14,44 L38,18 L60,44 L82,18 L106,44" ${ar}/>` },
  { id: 'x_drill', name: 'X-Drill (croix)', desc: '4 branches depuis centre', zone: 4, svg: co(60, 30) + co(22, 14) + co(98, 14) + co(22, 46) + co(98, 46) + line(60, 30, 24, 16) + line(60, 30, 96, 16) + line(60, 30, 24, 44) + line(60, 30, 96, 44) },
  { id: 'y_drill', name: 'Y-Drill réactif', desc: 'Choix G/D sur signal', zone: 5, svg: co(60, 50) + co(28, 16) + co(92, 16) + line(60, 46, 60, 30) + line(60, 30, 30, 18) + line(60, 30, 90, 18) + `<text x="60" y="12" text-anchor="middle" font-size="9" fill="currentColor">⚡</text>` },
  { id: 'miroir', name: 'Miroir 1v1', desc: 'Suivre le meneur (réactif)', zone: 5, svg: `<circle cx="42" cy="30" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="78" cy="30" r="5" fill="none" ${mut} stroke-width="2"/><path d="M50,30 L70,30" ${dash}/>` },
  { id: 'navette_10_20_30', name: 'Navette 10-20-30', desc: 'Aller-retours croissants', zone: 4, svg: co(16, 44) + co(52, 44) + co(84, 44) + co(112, 44) + `<path d="M16,40 L52,40 M16,32 L84,32 M16,24 L112,24" ${ar}/>` },
  { id: 'carioca', name: 'Carioca / pas croisés', desc: 'Déplacement latéral croisé', zone: 3, svg: co(16, 30) + co(104, 30) + `<path d="M20,30 q10,-10 20,0 t20,0 t20,0 t20,0" ${ar}/>` },
  { id: 'dot_drill', name: 'Dot drill', desc: 'Appuis sur points au sol', zone: 3, svg: [[35, 20], [85, 20], [60, 30], [35, 40], [85, 40]].map(p => dot(p[0], p[1])).join('') },
  { id: 'echelle_rythme', name: 'Échelle de rythme', desc: "Fréquence d'appui", zone: 3, svg: [0, 1, 2, 3, 4, 5].map(i => `<rect x="${14 + i * 17}" y="18" width="15" height="24" rx="2" fill="none" ${mut} stroke-width="1.5"/>`).join('') + `<path d="M10,30 L112,30" ${dash}/>` },
  { id: 'echelle_lat', name: 'Échelle latérale', desc: 'Icky shuffle', zone: 3, svg: [0, 1, 2, 3, 4, 5].map(i => `<rect x="${14 + i * 17}" y="18" width="15" height="24" rx="2" fill="none" ${mut} stroke-width="1.5"/>`).join('') + `<path d="M18,40 q8,-16 16,0 t16,0 t16,0 t16,0" ${ar}/>` },
  { id: 'mini_haies', name: 'Mini-haies fréquence', desc: 'Appuis rapides', zone: 4, svg: [0, 1, 2, 3, 4].map(i => `<path d="M${22 + i * 18},40 v-12 h6 v12" fill="none" ${mut} stroke-width="1.6"/>`).join('') + `<path d="M14,44 L110,44" ${dash}/>` },
  { id: 'reaction_couleur', name: 'Réaction couleur', desc: 'Plot appelé par le coach', zone: 5, svg: co(60, 50) + co(24, 16) + co(60, 14) + co(96, 16) + `<text x="60" y="46" text-anchor="middle" font-size="9" fill="currentColor">⚡</text>` },
  { id: '4_coins', name: '4 coins réactif', desc: 'Sprint vers un coin sur signal', zone: 5, svg: co(20, 14) + co(100, 14) + co(20, 46) + co(100, 46) + `<circle cx="60" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="2"/>` + [[20, 14], [100, 14], [20, 46], [100, 46]].map(p => line(60, 30, p[0], p[1], dash)).join('') },
  { id: 'freinage_relance', name: 'Freinage-relance', desc: 'Décélération puis accélération', zone: 5, svg: co(20, 30) + co(60, 30) + co(100, 30) + `<path d="M20,26 L58,26" ${ar}/><path d="M58,34 L100,34" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>` },
  { id: 'backpedal', name: 'Backpedal + sprint', desc: 'Retour arrière puis sprint', zone: 4, svg: co(30, 30) + co(90, 30) + `<path d="M90,26 L34,26" ${dash}/><path d="M34,34 L90,34" ${ar}/>` },
  { id: 'shuffle_lat', name: 'Shuffle latéral', desc: 'Pas chassés entre plots', zone: 3, svg: co(24, 30) + co(96, 30) + `<path d="M28,30 h64" ${ar}/><path d="M40,24 v12 M60,24 v12 M80,24 v12" ${dash}/>` },
]

export function presetById(id: string): AtelierPreset | undefined {
  return ATELIER_PRESETS.find(p => p.id === id)
}
