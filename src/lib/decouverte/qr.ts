// ══════════════════════════════════════════════════════════════════
// QR « Découverte » — génération des codes et de la planche imprimable.
//
// Le QR, déposé chez un partenaire (restaurant…), ouvre le test physique
// gratuit sur le SITE (jamais l'app : la personne n'a rien à télécharger).
// URL : https://<site>/defi?s=<code>[&t=<table>].
//
// Ce fichier vit dans src/lib (hors du scan « zéro couleur en dur ») : la
// planche est un DOCUMENT imprimable autonome, elle a donc ses couleurs
// littérales, hors des tokens de l'app.
// ══════════════════════════════════════════════════════════════════
import QRCode from 'qrcode'

/** Construit l'URL encodée dans le QR. */
export function urlDefi(base: string, code: string, table?: number | null): string {
  const racine = base.replace(/\/+$/, '')
  const params = new URLSearchParams({ s: code })
  if (table && table > 0) params.set('t', String(table))
  return `${racine}/defi?${params.toString()}`
}

/** QR en SVG (sans width/height fixes pour que la mise en page le dimensionne). */
export async function codeQR(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#0A0A0B', light: '#FFFFFF' },
  })
  return svg.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '')
}

export interface FichePlanche { sousTitre: string; url: string; svg: string }

export interface SourcePlanche { code: string; etablissement: string; tables: number }

/** Une fiche par table (resto) ou une seule fiche (établissement sans tables). */
export async function fichesPlanche(base: string, source: SourcePlanche): Promise<FichePlanche[]> {
  const fiches: FichePlanche[] = []
  if (source.tables > 0) {
    for (let t = 1; t <= source.tables; t++) {
      const url = urlDefi(base, source.code, t)
      fiches.push({ sousTitre: `Table ${t}`, url, svg: await codeQR(url) })
    }
  } else {
    const url = urlDefi(base, source.code)
    fiches.push({ sousTitre: '', url, svg: await codeQR(url) })
  }
  return fiches
}

/** Page A4 prête à imprimer : une fiche par QR, repères de découpe. */
export function plancheHTML(etablissement: string, fiches: FichePlanche[]): string {
  const cartes = fiches.map((f) => `
    <article class="fiche">
      <div class="accroche">Testez votre condition physique</div>
      <div class="gratuit">Gratuit · 2 minutes · aucune inscription pour commencer</div>
      <div class="qr">${f.svg}</div>
      ${f.sousTitre ? `<div class="table">${echap(f.sousTitre)}</div>` : ''}
      <div class="marque">the-hybridway.com</div>
    </article>`).join('')

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QR Découverte — ${echap(etablissement)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #F4F2EC; color: #0A0A0B;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  .entete { padding: 22px 28px 0; }
  .entete h1 { margin: 0; font-size: 18px; font-weight: 600; }
  .entete p { margin: 4px 0 0; font-size: 12px; color: #6B6B6B; }
  .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 14px; padding: 18px 28px 40px; }
  .fiche { border: 1px dashed #C9C6BD; border-radius: 12px; background: #FFFFFF;
    padding: 20px 16px 16px; text-align: center; display: flex; flex-direction: column;
    align-items: center; gap: 8px; break-inside: avoid; }
  .accroche { font-size: 15px; font-weight: 700; line-height: 1.25; }
  .gratuit { font-size: 10.5px; color: #6B6B6B; line-height: 1.4; }
  .qr { width: 150px; height: 150px; margin: 6px 0; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .table { font-size: 12px; font-weight: 600; }
  .marque { font-size: 11px; letter-spacing: .04em; color: #0A0A0B; font-weight: 600; }
  @media print {
    html, body { background: #FFFFFF; }
    .fiche { border-color: #BBBBBB; }
    @page { margin: 12mm; }
  }
</style></head>
<body>
  <div class="entete">
    <h1>${echap(etablissement)}</h1>
    <p>Découpez chaque carte et placez-la sur une table. Chaque QR ouvre le test physique gratuit sur le site.</p>
  </div>
  <div class="grille">${cartes}</div>
</body></html>`
}

function echap(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
