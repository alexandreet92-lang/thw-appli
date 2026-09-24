// ════════════════════════════════════════════════════════════════════════
// capture-chromium.mjs — capturer une page à une taille EXACTE.
//
// POURQUOI PAS `chromium --screenshot`. Mesuré : avec --window-size=1200,630
// le navigateur ne rend en réalité que ~528 px de haut, puis complète
// l'image jusqu'à 630 avec la couleur de fond. Le bas de la page semble
// vide alors qu'il est parfaitement en place — un piège silencieux, la
// capture ne signale rien.
//
// On passe donc par le protocole de débogage : on impose les dimensions du
// viewport, on attend que les POLICES soient prêtes (sans quoi on
// photographie un texte en cours de substitution), et on découpe au pixel.
//
// Aucune dépendance : WebSocket et fetch sont natifs depuis Node 22.
// ════════════════════════════════════════════════════════════════════════

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const CHEMINS = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']

export function navigateur() {
  return process.env.CHROME_BIN || CHEMINS.find(p => existsSync(p)) || null
}

const patiente = ms => new Promise(r => setTimeout(r, ms))

/** Ouvre une session sur le protocole de débogage du navigateur. */
async function session(port) {
  // La liste des cibles n'est pas servie à la milliseconde où le port s'ouvre.
  let cibles = null
  for (let essai = 0; essai < 60 && !cibles?.length; essai++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      cibles = (await r.json()).filter(c => c.type === 'page')
    } catch { /* pas encore prêt */ }
    if (!cibles?.length) await patiente(100)
  }
  if (!cibles?.length) throw new Error('Le navigateur n’a ouvert aucune page.')

  const ws = new WebSocket(cibles[0].webSocketDebuggerUrl)
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error('Connexion au navigateur refusée.')) })

  let compteur = 0
  const attentes = new Map()
  const evenements = new Map()
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && attentes.has(message.id)) {
      const { ok, ko } = attentes.get(message.id)
      attentes.delete(message.id)
      message.error ? ko(new Error(message.error.message)) : ok(message.result)
    } else if (message.method && evenements.has(message.method)) {
      evenements.get(message.method)()
      evenements.delete(message.method)
    }
  }

  return {
    envoyer: (method, params = {}) => new Promise((ok, ko) => {
      const id = ++compteur
      attentes.set(id, { ok, ko })
      ws.send(JSON.stringify({ id, method, params }))
    }),
    attendre: method => new Promise(ok => evenements.set(method, ok)),
    fermer: () => ws.close(),
  }
}

/**
 * Ouvre `url` dans un navigateur neuf, viewport imposé, polices chargées.
 * Renvoie la session et de quoi la refermer. Usage interne.
 */
async function ouvrir({ url, largeur, hauteur, sombre }) {
  const chrome = navigateur()
  if (!chrome) throw new Error('Aucun navigateur trouvé. Indiquer le chemin avec CHROME_BIN=…')

  const profil = mkdtempSync(join(tmpdir(), 'capture-'))
  const processus = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--user-data-dir=${profil}`,
    // Le navigateur va autrement chercher ses mises à jour de composants :
    // requêtes qui échouent derrière un proxy et brouillent les journaux.
    '--no-first-run', '--disable-background-networking', '--disable-component-update',
    '--disable-default-apps', '--disable-extensions',
    '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  const ranger = () => {
    processus.kill('SIGKILL')
    // Le navigateur écrit encore dans son profil à l'instant où on le tue :
    // un effacement immédiat échoue (ENOTEMPTY). On laisse Node réessayer.
    try {
      rmSync(profil, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
    } catch { /* un profil temporaire oublié ne mérite pas d'échouer la capture */ }
  }

  try {
    // Le port réel est écrit par le navigateur dans son dossier de profil.
    const fichierPort = join(profil, 'DevToolsActivePort')
    for (let essai = 0; essai < 100 && !existsSync(fichierPort); essai++) await patiente(50)
    if (!existsSync(fichierPort)) throw new Error('Le navigateur n’a pas démarré.')
    const port = Number(readFileSync(fichierPort, 'utf8').split('\n')[0])

    const cdp = await session(port)
    await cdp.envoyer('Page.enable')
    await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
      width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: false,
    })
    await cdp.envoyer('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: sombre ? 'dark' : 'light' }],
    })

    const chargee = cdp.attendre('Page.loadEventFired')
    await cdp.envoyer('Page.navigate', { url })
    await Promise.race([chargee, patiente(20000)])
    // Les polices d'abord : sinon on photographie la police de repli.
    await cdp.envoyer('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })
    await patiente(400)

    return { cdp, fermer: () => { cdp.fermer(); ranger() } }
  } catch (souci) {
    ranger()
    throw souci
  }
}

/**
 * Photographie `url` en `largeur` × `hauteur` exactement, et écrit `sortie`.
 * `sombre` force le thème nuit. Renvoie le poids du fichier, en octets.
 */
export async function capturer({ url, largeur, hauteur, sortie, sombre = true }) {
  const { cdp, fermer } = await ouvrir({ url, largeur, hauteur, sombre })
  try {
    const { data } = await cdp.envoyer('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: largeur, height: hauteur, scale: 1 },
    })
    mkdirSync(dirname(sortie), { recursive: true })
    const octets = Buffer.from(data, 'base64')
    writeFileSync(sortie, octets)
    return octets.length
  } finally {
    fermer()
  }
}

/**
 * Ouvre `url` et y évalue `expression` (du JavaScript, dans la page).
 * Renvoie la valeur obtenue. Sert à MESURER au lieu de supposer :
 * débordement horizontal, présence d'un élément, couleur calculée…
 */
export async function inspecter({ url, largeur, hauteur, expression, sombre = true }) {
  const { cdp, fermer } = await ouvrir({ url, largeur, hauteur, sombre })
  try {
    const { result, exceptionDetails } = await cdp.envoyer('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Erreur dans la page')
    return result.value
  } finally {
    fermer()
  }
}
