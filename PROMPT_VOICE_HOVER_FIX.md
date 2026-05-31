# Hover sidebar + transcription vocale live + restauration mode sombre

## Règle : corriger l'existant. Logique (streaming/historique/agents) intacte.

## FIX 1 — Hover conversations sidebar (mode sombre)
Bug trouvé dans le conv item (`HistoryDrawer`) :
- hover : `onMouseEnter → background = '#F5F5F5'` (blanc → erreur en sombre)
- actif : `background: 'rgba(0,0,0,0.06)'` (invisible en sombre)

Correction :
- hover → `rgba(255,255,255,0.06)`
- actif → `rgba(255,255,255,0.08)`

## FIX 2 — Transcription vocale temps réel
Composant vocal existant (`startVoice`/`stopVoice`/`recording`, ondes + chrono + ✕/✓).
Problème : `interimResults = false` et `onresult` appelait `stopVoice()` au 1er résultat → aucun live.

Ajouts :
- États `liveTranscript` (final) + `liveInterim` (provisoire) + refs `finalTranscriptRef`/`interimRef`
- `recognition.continuous = true`, `interimResults = true`, `lang = 'fr-FR'`
- `onresult` : accumule final dans le ref, met à jour les états (ne stoppe plus)
- `onend` : ne transfère rien (le ✓ s'en charge)
- Réinitialisation à '' au démarrage de chaque session
- Affichage sous les ondes : "À l'écoute…" (italique, text-dim) si vide ; sinon final en `var(--text)` + interim en `var(--text-mid)`
- Bouton ✓ → `confirmVoice()` : stop + transfère `(final+interim).trim()` dans le textarea + focus
- TypeScript : handlers en `(e: any)` (déjà le cas)

## FIX 3 — Restaurer mode sombre d'origine (globals.css `.dark`)
Annule le passage au noir pur du commit précédent :
--bg #080A0F, --bg-alt #0B0E15, --bg-card #0F1117, --bg-card2 #0D1219,
--bg-hover rgba(255,255,255,0.05), --border #1E2533, --border-mid #263042,
--input-bg #0B0E15, --nav-bg #080A0F. (Autres valeurs .dark inchangées.)

## Fichiers : globals.css, src/components/ai/AIPanel.tsx
