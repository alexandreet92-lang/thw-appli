# PROMPT_REGLAGES_MODELES — Sous-page Modèles dans les Réglages IA

## Objectif
Remplacer le Sheet (bottom-sheet) "Les modèles IA" dans IASettingsBloc
par une sous-page slide-in depuis la droite, identique au mécanisme
d'animation de la sous-page Abonnement.

## Fichiers modifiés
- src/app/profile/page.tsx (IASettingsBloc + nouveau ModelesSubPage)

## Analyse code
- `MODEL_MULTIPLIERS` dans `src/lib/tokens/multipliers.ts` :
  hermes=1, athena=3, zeus=8 → mapping confirmé
- Animation `.sub-page-enter` / `.sub-page-exit` déjà définie dans styleBlock
  (créée pour AbonnementSubPage) → réutilisée telle quelle
- État `modelsOpen` actuel : booléen → renommé `modelsPageOpen`
  (sémantique : sous-page au lieu de Sheet)

## Composant ModelesSubPage
Props : `{ onBack: () => void }`
Structure analogue à AbonnementSubPage :
- État `closing: boolean` pour gérer l'animation de sortie
- handleBack : setClosing(true) puis setTimeout(onBack, 240)
- Header sticky : bouton ←, "Les modèles IA" + "Trois niveaux selon ta demande"

### Cards modèles
Pour chaque modèle : nom, sous-titre, multiplicateur (× N), MULTIPLICATEUR label, description.

Hermès (or `#B8860B`) — × 1
- Sous-titre : "Rapide et direct"
- Desc : "Pour les questions simples, conseils rapides ou besoins immédiats."

Athéna (cyan `#06B6D4`) — × 3 — **mise en avant** :
- Border 2px solid #06B6D4 au lieu de 0.5px
- Badge "RECOMMANDÉ" position absolute top:-10px, left:16px
- Sous-titre : "Coaching intelligent"
- Desc : "Le modèle principal. Analyse, contextualise et propose des améliorations concrètes."

Zeus (violet `#7C3AED`) — × 8
- Sous-titre : "Le plus avancé"
- Desc : "Pour les analyses très poussées, plans complexes et stratégies sur le long terme."

### Note explicative
Background var(--bg-alt) ou var(--bg-card2) si --bg-alt indisponible,
border-radius 10px, padding 12px 14px, fs 12, line-height 1.55 :
"Tous les modèles sont accessibles. Le multiplicateur indique à quelle
vitesse ton quota se vide."

### Bouton "En savoir plus"
Full-width, transparent, border 0.5px solid var(--border), padding 14px,
fs 14, fw 500. Icône ExternalLink à gauche. href vers `/comprendre/ia`
(page pas encore créée — 404 attendu pour V1).

### Layout responsive
- maxWidth 600px desktop, padding 24px
- padding 16px mobile
- Cards 100% width, gap 12px

## Modifications IASettingsBloc
1. Renommer `modelsOpen` → `modelsPageOpen`, `setModelsOpen` → `setModelsPageOpen`
2. Supprimer `<Sheet open={modelsOpen}>...</Sheet>` et le remplacer par :
   ```tsx
   {modelsPageOpen && <ModelesSubPage onBack={() => setModelsPageOpen(false)} />}
   ```
3. NavRow Modèles → onClick={() => setModelsPageOpen(true)}

## Vérifications
- npm run build : 0 erreur TypeScript
- Multiplicateurs cohérents avec MODEL_MULTIPLIERS
- Animation slide-in 280ms identique à Abonnement
