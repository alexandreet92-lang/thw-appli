# AI Coach Redesign — Analyse & Implémentation

## Lecture des fichiers

### Variables CSS globales
- `--bg`, `--bg-card`, `--bg-alt`, `--border`, `--text`, `--text-mid`, `--text-dim` définis dans globals.css
- `--ai-accent`, `--ai-accent-dim` définis dans `:root`
- Les variables `--ai-bg`, `--ai-text`, `--ai-border`, `--ai-mid`, `--ai-dim`, `--ai-bg2` sont définies dans un `<style>` INLINE dans AIPanel.tsx (ligne ~18696) sous `.aip-root`

### Cause racine du fond blanc
- `.aip-root` (light) : `--ai-bg: #ffffff` — hardcodé blanc
- Input zone : `className="… bg-white dark:bg-[#0A0A0A]"` — hardcodé blanc
- Input wrapper : `className="… bg-white dark:bg-[#1E1E1E]"` — hardcodé blanc
- La zone chat hérite de `.aip-root` mais les classes Tailwind `bg-white` surchargent

### Agents actifs dans le code
Sidebar AISidebar.tsx : 3 onglets — **Training** (actif, conversations réelles), **Networks** (liste vide), Projects (vide)
Le pill "agent" dans l'input mappe `model === 'zeus'` → "Networks", sinon → "Training"

### Streaming
`TypedText` + `rAF` loop dans AIPanel.tsx lignes 285–344 — **non touché**

### Historique
localStorage `thw_ai_convs_v3` + `loadConvs()`/`saveConvs()` — **non touché**

### Salutation dynamique
`getGreeting()` ligne 149 → "Bonjour, bon matin!" / "Bon après-midi!" / "Bonsoir!" — **non touché**

### Logo animé
`<img src={model === 'zeus' ? '/logos/logo_6bras.png' : '/logos/logo_4bras.png'}` — **non touché**

### Saisie vocale
`useVoiceInput` hook déjà branché → `isListening`, `startListening`, `stopListening` — **non touché**

---

## Fichiers modifiés

1. `src/app/globals.css` — ajout keyframes `blink`, `dotFlashing`, `pulse-red`
2. `src/components/ai/AIMessageBubble.tsx` — bulle user en cyan (#06B6D4), avatar AI mis à jour
3. `src/components/ai/AIPanel.tsx` — corrections chirurgicales :
   - `--ai-bg: var(--bg)` au lieu de `#ffffff`
   - `--ai-bg2: var(--bg-card)` au lieu de `#F7F7F7`
   - Suppression `bg-white` dans input zone et wrapper
   - Ajout state `activeAgent` + pills Training/Networks au-dessus du champ
   - Ajout 4 chips de suggestions dans l'écran d'accueil
   - Bouton envoi en couleur agent (#06B6D4)
