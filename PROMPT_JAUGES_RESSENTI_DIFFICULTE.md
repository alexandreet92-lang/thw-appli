# PROMPT_JAUGES_RESSENTI_DIFFICULTE — Jauges Ressenti / Difficulté sur la fiche activité

## Base de données — migration appliquée
`activities` ne contenait ni `feeling` ni `difficulty` (seulement `rpe` et `perceived_effort`). Migration `add_feeling_difficulty_columns` appliquée sur project `sfrcnyzntgrxlwlmwifi` :

```sql
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS feeling    NUMERIC(2,1) CHECK (feeling    IS NULL OR (feeling    >= 0 AND feeling    <= 5)),
  ADD COLUMN IF NOT EXISTS difficulty NUMERIC(3,1) CHECK (difficulty IS NULL OR (difficulty >= 0 AND difficulty <= 10));
```

Activity TypeScript interface étendue avec `feeling: number | null` + `difficulty: number | null`.

## Composants ajoutés

### `GaugeArc`
Arc 3/4 cercle, ouverture en bas :
- SVG 110×110, `<circle r=46>`, `strokeWidth=6`, `strokeLinecap="round"`
- `strokeDasharray="217 289"`, `transform="rotate(135 55 55)"` → 270° d'arc
- Background gris `var(--border)`
- Filled `strokeDasharray="<ratio*217> 289"` couleur sémantique
- Centre : valeur 32 px / 700 / tabular + denom 11 / var(--text-dim)
- Sous l'arc : label uppercase 10 / 700 / 0.12em, description 13 / 600
- Bouton Modifier / Ajouter en cyan `#06b6d4` / underline

### `GaugeEditModal`
Portal sur `document.body` (z-index 700/701), max-width 480 px centré :
- Header titre 18 + croix ✕
- Aperçu jauge 140 px (même SVG, denom "sur X")
- Description sémantique sous l'aperçu
- `<input type="range">` step=0.5, accentColor = couleur sémantique courante (mise à jour live)
- Boutons Annuler (`var(--bg-card2)`) / Enregistrer (`#06b6d4`)
- Drag → `setDraft` → re-render aperçu en temps réel

### `FeelingDifficultyCard`
- Grid 2 colonnes, gap 16, background `var(--bg-card2)`, radius 14, padding 20, margin 16 0
- 2 `GaugeArc` (Ressenti / Difficulté)
- 1 `GaugeEditModal` partagé entre les 2 jauges
- Save : `supabase.from('activities').update({ [kind]: v }).eq('id', activity.id)`
- Toast `Enregistré` au succès / `Échec de la sauvegarde` au fail (via `useToast()`)
- State local mis à jour après save → arc se met à jour sans refetch

## Seuils sémantiques

### Ressenti (0-5, step 0.5)
| Plage | Couleur | Description |
|---|---|---|
| 0 – 1.5 | `#ef4444` | Triste |
| 2 – 3   | `#eab308` | Normal |
| 3.5 – 4.5 | `#10b981` | Bien |
| 5 | `#06b6d4` | Incroyable |

### Difficulté (0-10, step 0.5)
| Plage | Couleur | Description |
|---|---|---|
| 0 – 3   | `#10b981` | Facile |
| 3.5 – 5 | `#84cc16` | Modérée |
| 5.5 – 6 | `#eab308` | Un peu dur |
| 6.5 – 7.5 | `#f97316` | Difficile |
| 8 – 9   | `#ef4444` | Très difficile |
| 9.5 – 10 | `#991b1b` | Terrible |

## État "non saisi"
Si `feeling === null` ou `difficulty === null` :
- Arc background gris seul (pas de fill coloré)
- Centre : `—` en 32 px en `var(--text-dim)` (pas de denom "sur X")
- Description : `Non renseigné` en italique `var(--text-dim)`
- Bouton : `Ajouter` au lieu de `Modifier` (couleur identique)

## Emplacement
**Mobile** : `<FeelingDifficultyCard activity={a} />` inséré dans `ActivityDetail` mobile, juste avant `<RecordsBeaten />`, dans le wrapper `padding: '0 16px'`.

**Desktop** : idem, juste avant `<RecordsBeaten activityId={a.id} isBike={isBike} />` dans la branche desktop.

## Responsive
- Mobile portrait : 2 jauges côte à côte (110 px tiennent sur < 320 px)
- Desktop / tablette : 2 jauges côte à côte (grid 2 cols)

## Vérification
- ✅ `npm run build` exit 0
- ✅ Migration `feeling` + `difficulty` appliquée
- ✅ Card s'affiche entre stats principales et card Records (mobile + desktop)
- ✅ Arc 3/4 cercle ouvert en bas, chiffre 32 px tabular au centre
- ✅ Couleurs sémantiques selon valeur
- ✅ État null → `—` + `Non renseigné` + bouton `Ajouter`
- ✅ Tap sur bouton → modal portalisé avec aperçu live + slider step 0.5
- ✅ Enregistrer : update Supabase + toast `Enregistré` + state local maj
- ✅ Couleurs neutres via `var(--bg-card2)` / `var(--border)` / `var(--text)` / `var(--text-dim)` → mode jour/nuit OK
- ✅ Pas de smileys ni d'icônes (uniquement chiffre + couleur)
