# PROMPT_SESSION_SAVE_FORM

## Objectif
Afficher un formulaire plein-écran avant de sauvegarder la séance, au lieu de sauvegarder immédiatement.

## Déclencheur
Quand l'utilisateur appuie sur TERMINER (confirming_stop → onConfirmFinish), afficher le formulaire.
NE PAS sauvegarder avant validation du formulaire.

## Écran formulaire
Plein écran, même thème (isDark). Animation slide depuis le bas 300ms.

### Header
- Bouton retour (chevron gauche) à gauche → revient au compteur en pause sans perdre les données
- Titre "Enregistrer l'activité" centré, font-semibold
- Bouton "Enregistrer" à droite, couleur #06B6D4

### Section Titre
Label "TITRE" uppercase 10px.
Input text pré-rempli automatiquement : "Sortie vélo · Sam 25 mai" ou "Running · Matin".

### Section Type d'entraînement
Label "TYPE D'ENTRAÎNEMENT" uppercase.
Chips multi-sélection, flex-wrap.

Pour cyclisme :
```ts
const CYCLING_TYPES = [
  { id:'ef',      label:'EF',      desc:'Endurance fondamentale' },
  { id:'pma',     label:'PMA',     desc:'Puissance maximale aérobie' },
  { id:'seuil',   label:'Seuil',   desc:'Effort au seuil' },
  { id:'sprints', label:'Sprints', desc:'Efforts courts et intenses' },
  { id:'tempo',   label:'Tempo',   desc:'Allure soutenue' },
  { id:'recup',   label:'Récup',   desc:'Récupération active' },
]
```
Chip actif : bg-gradient cyan→bleu, text-white. Inactif : border, bg-card.

### Section RPE
Label "RESSENTI (RPE)" uppercase.
Slider custom 0–10 pas 0.5.
Valeur en text-4xl font-bold, couleur selon valeur :
- 0–3 : #10B981 (vert)
- 3.5–6 : #F59E0B (ambre)
- 6.5–8 : #F97316 (orange)
- 8.5–10 : #EF4444 (rouge)

Description : "Très facile" / "Facile" / "Modéré" / "Difficile" / "Très difficile" / "Effort maximal"

Track 6px rounded, thumb 24px blanc, touch+mouse.

### Section Commentaire
Textarea 4 lignes, resize-none.

### Bouton sticky bottom
Pleine largeur, h-52px, dégradé cyan→bleu, rounded-2xl.

## Migration SQL
```sql
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS training_types text[],
  ADD COLUMN IF NOT EXISTS rpe numeric(3,1),
  ADD COLUMN IF NOT EXISTS comment text;
```

## Fichiers
- components/record/SessionSaveForm.tsx  (< 200 lignes)
- components/record/RPESlider.tsx        (< 80 lignes)
- components/record/TrainingTypeSelector.tsx (< 80 lignes)
- Modifier CyclingScreen.tsx : onConfirmFinish → affiche formulaire, pas save

## Règle
- npm run build doit passer
- Merger sur main, pas de PR
