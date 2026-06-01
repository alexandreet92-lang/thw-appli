# Compétences — Refonte mobile + saisie vocale

Corrections ciblées mobile de /competences + dictée vocale temps réel.
Pas de changement de logique métier (toggle/IA/conflits). Desktop intact
sauf le fond blanc.

## Fixes
1. **Fond blanc pur** : conteneurs page (mobile + desktop) en `var(--bg-card)`
   (#fff en clair, s'adapte en sombre).
2. **Tabbar masquée** : `MobileTabBar` retourne `null` si `pathname`
   commence par `/competences`. Idem `GlobalAIButton` (évite le chevauchement
   du bouton flottant avec le champ fixe).
3. **Header mobile dédié** (sticky top:0) : burger filtres (gauche, 32×32),
   titre "Compétences" + sous-titre centrés, bouton X retour (droite) →
   `router.back()` sinon `router.push('/')`.
4. **Chips sports** : plus aérés (gap 8, padding 6×14, radius 18, font 12),
   scrollables sans scrollbar (`.comp-chips-scroll`), texte non coupé
   (`white-space: nowrap`), fond `--bg-card` inactif / cyan actif.
5. **Compteur** sous les chips, `font-size 12`, nombre en cyan bold 13.
6. **Champ d'écriture** (variant mobile de `CreateCompetencePanel`) : carte
   blanche flottante `position: fixed; bottom: 16`, ombre, radius 16, glow
   cyan au focus (via `.comp-input-wrap`). Row sous textarea : badge "Athéna"
   à gauche, mic + envoi à droite. Liste avec `padding-bottom` suffisant.
7. **Section header non coupée** : header sticky, contenu en flux normal sous
   l'offset du layout.
8. **Saisie vocale temps réel** (Web Speech API) :
   - Nouveau hook typé `useSpeechToText(onTranscript)` (sans `any`).
   - Composant `MicButton` : se masque si non supporté, devient rouge + pulse
     (`@keyframes micPulse`) pendant l'écoute, 2e clic arrête.
   - Branché sur les champs de la page Compétences (création + modal détail).
   - L'AI Coach a déjà sa propre dictée fonctionnelle (inchangée).

## Fichiers
- `src/hooks/useSpeechToText.ts` (nouveau)
- `src/components/ai-coach/MicButton.tsx` (nouveau)
- `src/app/globals.css` (micPulse, .mic-listening, .comp-chips-scroll)
- `src/components/MobileTabBar.tsx`, `src/components/ai/GlobalAIButton.tsx`
- `src/app/competences/page.tsx`
- `src/app/competences/components/CreateCompetencePanel.tsx`
- `src/app/competences/components/CompetenceDetailModal.tsx`

npm run build : 0 erreur TypeScript.
