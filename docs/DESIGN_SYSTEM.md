# THW Coaching — Langage de design

> Source de vérité unique pour l'esthétique de l'app. À lire avant toute UI.
> Les valeurs de tokens ici doivent correspondre **exactement** à `globals.css`.
> En cas de divergence, `globals.css` est la vérité technique et doit être aligné.

---

## 0. Principe directeur

**Le calme par soustraction.** L'app a l'air premium quand elle est disciplinée,
pas quand elle est décorée. Chaque élément doit justifier sa présence. Le niveau
supérieur vient de ce qu'on retire — couleurs, bordures, tailles, répétitions —
pas de ce qu'on ajoute. Si une vue a l'air « excitante » ou « chargée », elle est
ratée : l'élégance se lit comme du calme.

Trois inspirations : la rigueur de grille de Linear, la densité lisible de Whoop,
la retenue éditoriale d'un bon magazine.

---

## 1. Typographie

Deux voix, jamais plus.

| Voix | Police | Token | Usage |
|------|--------|-------|-------|
| Éditoriale | Fraunces (serif) | `--font-display` | Titres de page, accroches, titres de section — **casse normale**, taille ≥ 15px |
| Fonctionnelle | Inter (sans) | `--font-body` | Tout le reste : labels, boutons, corps, métadonnées, **et tous les chiffres** |

**Règles dures :**
- Fraunces n'apparaît **jamais** sous 15px, jamais sur un label, jamais sur une donnée.
- Tous les chiffres sont en Inter **tabulaire**, **zéro non barré** :
  `font-variant-numeric: tabular-nums; font-feature-settings: 'zero' 0;`
- La police est appelée par **token** (`var(--font-display)` / `var(--font-body)`),
  jamais en littéral `'Inter'` / `'Fraunces'` dans les composants.
- **Polices interdites / supprimées** : DM Mono, Syne, Nunito, Bebas Neue,
  Roboto Mono, Barlow Condensed. Aucun monospace.

**Échelle de tailles** (ne pas inventer de taille hors échelle) :

| Rôle | Police | Taille | Poids |
|------|--------|--------|-------|
| Titre de page | Fraunces | 28 (24 mobile) | 600 |
| Accroche / lead | Fraunces | 17 | 500 |
| Titre de section | Fraunces | 15 | 600 |
| Corps | Inter | 14 | 400–500 |
| Label | Inter | 12–13 | 500–600 |
| Micro / méta | Inter | 11 | 500 |
| Métrique focale | Inter tab. | 40–42 (38 mobile) | 600 |
| Métrique | Inter tab. | 22–23 (19 mobile) | 600 |

---

## 2. Couleur — budget strict

**Une vue = neutres + au plus UN accent + points sémantiques.** Rien d'autre.

- **Aucune surface colorée.** Jamais de carte, bloc ou bouton à fond coloré plein
  ni à bordure colorée pleine. La sémantique se porte par un **point de 7px** ou un
  **texte teinté**, jamais par une surface.
- **Accent unique** : `--primary` (cyan), réservé à l'action principale, aux liens
  et au focus. Au plus un accent visible par vue.
- `--ai-accent` (violet) est **exclusif aux composants Coach IA**. Jamais ailleurs.
- **Aucune couleur en dur** dans le code feature (hex/rgb/hsl). Toujours `var()`.
  Vérifié par le check de build (voir le repo `scripts/check-colors.mjs`).

**Neutres** (tokens thémés clair/sombre, déjà dans `globals.css`) :
`--bg`, `--bg-card`, `--bg-card2`, `--text`, `--text-mid`, `--text-dim`, `--border`.

**Sémantique de charge** (points uniquement) :
`low #22c55e` · `mid #eab308` · `hard #ef4444`.

**Immuables** (référence, ne changent jamais — définis comme constantes
sanctionnées, exemptées du check) : couleurs **sport** (`--sport-*`) et **zones
d'intensité** (`--zone-1..5`). Voir annexe.

---

## 3. Structure & espace

- **La séparation se fait par l'espace et le fond**, pas par la bordure.
  Un bloc se détache en passant sur `--bg-card2`, pas en se faisant encadrer.
- **Bordures** : autorisées uniquement sur les **inputs** et l'état **focus**.
  Aucune bordure décorative sur cartes, boutons, pilules, cases.
- **Radius** : `--r-sm: 8px` · `--r-md: 14px` · `--r-lg: 20px`. Rien d'autre.
- **Espacement** : grille 4px via `--space-*`. Pas de valeur d'espacement arbitraire.

---

## 4. Hiérarchie

- **Une focale par vue.** Un seul élément domine (le hero) ; tout le reste se
  subordonne en taille et en poids. Pas trois blocs de même poids qui se battent.
- **Pas de répétition de chrome.** Quatre badges identiques, quatre anneaux à zéro :
  c'est du bruit. Fusionner ou supprimer.

---

## 5. Élément signature

Chaque famille de page mérite **un** moment mémorable, et un seul.
Pour les données dans le temps : un micro-graphe SVG brut qui révèle une forme
d'un coup d'œil (ex. le **rythme de la semaine** de Mon Plan : barres dont la
hauteur encode la charge, qui donnent à voir la périodisation). Pas de lib de chart.

---

## 6. États

- **Skeleton, jamais de spinner.** Le skeleton reprend la forme exacte du contenu.
- **Vide = invitation à agir**, dans la voix de l'interface. Une erreur explique
  quoi s'est passé et comment le corriger ; elle ne s'excuse pas, ne reste pas vague.
- Touch targets **≥ 44px**. Focus visible. `prefers-reduced-motion` respecté.

---

## 7. Règles absolues (binaires — ne jamais violer)

1. Zéro couleur en dur dans le code feature → toujours `var(--token)`.
2. Zéro surface à fond ou bordure colorée pleine.
3. `--ai-accent` jamais hors Coach IA.
4. Police toujours via `var(--font-display)` / `var(--font-body)`.
5. Chiffres toujours Inter tabulaire, zéro non barré.
6. Aucune police hors Fraunces / Inter (les anciennes sont supprimées).
7. Bordure uniquement sur input/focus.
8. Tailles, radius, espacements : uniquement les tokens de l'échelle.
9. Zéro lib de chart (SVG brut). Zéro `any`. Zéro mock data.
10. Skeleton, pas spinner.

---

## 8. Exemple de référence — Mon Plan

Anatomie validée, à imiter :
- **En-tête éditorial** : « Mon plan » (Fraunces 28) + état discret à droite (Inter).
- **Hero focal** : sur `--bg-card2`, sans bordure. Accroche Fraunces « Aujourd'hui,
  mercredi 10 » + point de charge, puis la **métrique focale** (kcal du jour, Inter
  tab. 42), macros en sous-texte, et le lien cyan « calé sur ta séance → » qui
  expose le différenciateur (la nutrition qui connaît l'entraînement).
- **Cibles par type de jour** : trois colonnes nues, séparées par l'espace,
  chacune un point de couleur + le nombre. Aucune carte, aucune bordure.
- **Rythme des 14 jours** (signature) : barres SVG, hauteur = charge, couleur de
  charge en points/tons ; aujourd'hui surligné par un fond `--bg-card2`, pas une bordure.
- **Actions** : une seule action principale en cyan (compacte, 36px), le reste en
  texte simple ; « Supprimer » démoté en gris.

---

## Annexe — couleurs immuables (référence)

Sport : `run #f97316` · `bike #3b82f6` · `swim #06b6d4` · `gym #8b5cf6` ·
`hyrox #ec4899` · `rowing #14b8a6`.
Zones : `Z1 #9ca3af` · `Z2 #22c55e` · `Z3 #eab308` · `Z4 #f97316` · `Z5 #ef4444`.
