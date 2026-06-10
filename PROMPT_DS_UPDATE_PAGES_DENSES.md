# Mise à jour du design system — pages denses (couleur, animation, saisie)

## Cadre
Aucune page restylée ici. On ajoute trois principes à docs/DESIGN_SYSTEM.md, qui
gouvernent les pages denses (Planning, Calendar, Performance). Idempotent : si une
section existe déjà à l'identique, ne pas la dupliquer.

## À ajouter à docs/DESIGN_SYSTEM.md

### Couleur sur les pages denses (extension de la §2)
Sur les pages où la couleur porte du sens (sport, zone d'intensité, catégorie
d'événement), la couleur fonctionnelle est autorisée — mais uniquement via le
**support minimal** : un point (~7px), un filet vertical de 3px, un petit tag, ou un
fond teinté à très faible opacité. JAMAIS une surface saturée pleine, JAMAIS un
chiffre coloré. La couleur **décorative** (chiffre coloré « pour faire joli », barre
de progression teintée sans raison, badge dégradé) est neutralisée : chiffres et
surfaces en tokens neutres. L'accent unique reste var(--primary).

Palettes fonctionnelles sanctionnées (exemptées du check couleurs, définies comme
constantes) : sports (run/bike/swim/gym/hyrox/rowing), zones d'intensité (5 FC,
5 allure, 7 puissance), catégories calendrier (race/pro/perso/gty).

### Animation des jauges / barres
Les barres de zones et de progression s'animent en remplissage (largeur 0 → valeur)
au montage et à chaque changement de jeu de données. Transition ~0,9 s, easing doux.
Respecter `prefers-reduced-motion` (pas d'animation si réduit).

### Saisie / édition de données
Les formulaires de saisie ou d'édition volumineux ne s'affichent PAS en inline sur la
page (ça la surcharge). Ils s'ouvrent dans une **feuille coulissante (bottom sheet)**
via createPortal sur document.body, déclenchée par un bouton « Renseigner » /
« Modifier ». Champs soignés : coins arrondis (--r-sm/10px), unité intégrée à droite,
focus var(--primary) + halo var(--primary-dim).

## Réalisation
Ajouts à `docs/DESIGN_SYSTEM.md`, en sous-sections (sans renumérotation, idempotent) :
- §2.1 « Couleur sur les pages denses » ;
- §3.1 « Saisie / édition de données » ;
- §6.1 « Animation des jauges / barres ».

## Contraintes
- Seul docs/DESIGN_SYSTEM.md est modifié. Pas de code applicatif touché.
- Commit local, NE PAS push, aucun déploiement Vercel.
