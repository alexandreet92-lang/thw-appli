# Coach IA — Refonte design (inspiration Claude)

## Philosophie
S'inspirer de l'interface Claude : minimalisme, espace blanc généreux, 
pas de conteneurs superflus, typographie raffinée, micro-interactions 
subtiles. Le contenu prime sur le chrome.

---

## 1. Indicateur "IA réfléchit" — REFONTE PRIORITAIRE

### Problème actuel
Le logo apparaît à gauche, suivi d'une pilule grise/violette contenant 
3 petits points violets. La pilule est moche et inutile.

### Cible
Supprimer complètement la pilule contenante.
Garder uniquement :
- Le logo du modèle IA actif (animé selon les specs déjà définies)
- 3 points "..." alignés à droite du logo, SANS fond, SANS bordure
- Les 3 points ont leur propre animation discrète :
  - Chaque point pulse/fade en cascade (point 1, puis 2, puis 3)
  - Couleur : gris moyen (var equivalent à text-secondary)
  - Taille : 5px de diamètre chacun, espacement 4px
  - Durée du cycle : 1,4s avec délai de 0,2s entre chaque point
  - Animation : opacity de 0.3 à 1 puis retour

Exemple CSS keyframes :
@keyframes dot-pulse {
  0%, 60%, 100% { opacity: 0.3; }
  30%           { opacity: 1; }
}
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

Résultat : juste le logo qui tourne + 3 points qui pulsent à côté, 
flottant naturellement dans l'espace, comme chez Claude.

---

## 2. Bulles de messages

### Message utilisateur (actuellement bleu gradient)
Trop voyant. Adoucir :
- Fond : bleu plus subtil, sans gradient (couleur unie)
- Couleur : un bleu moyen genre #2563EB ou similaire, pas saturé
- Border-radius : 18px (plus arrondi, moins "boîte")
- Padding : 10px 16px
- Texte blanc, font-weight 400

### Message IA (déjà bon)
Pas de bulle, texte directement sur le fond. Garder ainsi.
S'assurer que la marge gauche aligne le texte avec le logo.

---

## 3. Sidebar conversations

### Problème actuel
Les éléments sont denses, chacun montre "titre + sous-titre temps".
Le fond gris fait lourd.

### Cible (inspiration Claude)
- Fond de la sidebar : même couleur que le main content (blanc) 
  OU très légèrement plus clair (#FAFAFA), pas de gris franc
- Bordure droite de la sidebar : 0.5px gris très clair seulement
- Items de conversation :
  - Padding : 10px 14px
  - Border-radius : 8px
  - Hover : fond gris très clair (#F5F5F5)
  - Active : fond gris léger (#EEEEEE) + texte légèrement plus gras
  - Une seule ligne par item : titre tronqué + date discrète à droite 
    (au lieu de titre/sous-titre empilés)
  - Taille texte : 13px
- Header "CONVERSATIONS" :
  - Garder le label
  - Espacement augmenté (margin-bottom 12px)
  - Le bouton "+" passe en bleu cohérent (cf. correction précédente) 
    et plus discret (taille 24px)

---

## 4. Zone d'input (bas)

### Problème actuel
La zone "Pose ta question..." + toolbar (+ / T Serif / shuriken) 
manque de raffinement.

### Cible
- Container de l'input :
  - Fond blanc
  - Bordure : 1px solid #E5E7EB
  - Border-radius : 16px (plus arrondi)
  - Padding : 12px 16px
  - Box-shadow très subtile : 0 1px 3px rgba(0,0,0,0.04)
  - Focus : bordure passe en bleu accent (cohérent avec l'app), 
    shadow légèrement plus prononcée
- Toolbar en bas (+, T Serif, shuriken) :
  - Réduire la taille des boutons à 28px
  - Pas de fond/bordure visible au repos
  - Hover : fond gris très clair, border-radius 6px
  - Icônes : couleur gris moyen, pas noir
- Bouton "Envoyer" (rond bleu en bas à droite) :
  - Garder bleu mais sans gradient (couleur unie cohérente avec 
    le reste de l'app)
  - Disabled quand input vide : opacity 0.4, pas cliquable

---

## 5. Header du Coach IA (haut)

### Problème actuel
"THW Coach" en haut à gauche + sous-titre + 3 boutons à droite. 
Manque d'élégance.

### Cible
- "THW Coach" : font-weight 500, taille 15px
- Sous-titre (titre de la conversation active) : taille 12px, 
  gris moyen, tronqué si long
- Les 3 boutons à droite (chat, +, maximize, close) :
  - Boutons icon-only, 32px, sans fond visible
  - Hover : fond gris très clair, border-radius 6px
  - Icônes monochromes gris foncé
  - Espacement entre eux : 4px

---

## 6. Typographie globale
Inspiration Claude : utiliser Inter ou la police sans-serif déjà 
en place pour le corps. Si une police serif est utilisée quelque 
part (le bouton "T Serif" suggère un choix utilisateur), garder 
cette option mais s'assurer que la sans-serif par défaut est 
parfaitement lisible.

Tailles :
- Corps de message : 15px, line-height 1.6
- Titres dans la sidebar : 13px
- Métadonnées (dates, sous-titres) : 12px, gris moyen

---

## 7. Espacements généraux
Augmenter le respiration partout :
- Padding du conteneur principal : 24px (au lieu de moins)
- Espace vertical entre les messages : 20px minimum
- Marge gauche du texte IA pour s'aligner avec le logo

---

## Note importante
Ne pas toucher à la logique, au streaming, à l'envoi de messages, 
ni aux fonctionnalités du Coach IA. Refonte purement visuelle.
