# Coach IA — Refonte complète

## ⚠️ Contrainte d'implémentation obligatoire
Le scope est large. Ne jamais écrire plus de 200 lignes dans un seul 
fichier en une seule fois. Décomposer en composants séparés et 
exécuter par étapes dans l'ordre listé ci-dessous.

Avant de commencer : 
- Lire le composant Coach IA existant et identifier sa structure
- Établir une liste des fichiers à créer/modifier
- Implémenter section par section, valider le build entre chaque

---

## SECTION A — Refonte visuelle pure

### A1. Couleur bulle utilisateur
La bulle bleue saturée actuelle → remplacer par #3B8FD4 
(même bleu que le logo shuriken).
Pas de gradient, fond uni, texte blanc font-weight 400.

### A2. Bouton "+" sidebar (à côté de CONVERSATIONS)
Actuellement bleu vif trop voyant.
Refonte :
- Carré 28×28px, border-radius 8px (au lieu de pill)
- Fond : bleu accent app avec opacity 0.85
- Hover : opacity 1, transition 150ms

### A3. "Réglages IA" bas de sidebar
- Padding 12px 16px (plus généreux)
- Hover : fond gris très clair #F5F5F5
- Icône engrenage 16px, espacement 8px du texte
- Texte 13px, gris foncé

### A4. Header haut — simplifier
4 icônes actuellement (chat bulle avec point bleu, +, maximize, X).
Garder uniquement :
- Maximize/restore
- Close (X)
Supprimer "+" (déjà dans sidebar) et la chat bulle si pas de notifs.
Si la chat bulle gère des notifications réelles : la conserver.

### A5. Logo shuriken devant messages IA
- Aligner verticalement avec la première ligne de texte (top alignment)
- Taille : passer à 20px (au lieu de la taille actuelle plus petite)
- Marge droite : 12px du texte

### A6. Sous-titre du header (titre de conversation active)
Sous "THW Coach", le titre de la conversation active.
- Taille 12px, couleur gris moyen
- Tronqué avec ellipsis si long
- Max-width raisonnable pour ne pas pousser les boutons droite

---

## SECTION B — Streaming et comportements

### B1. Streaming (effet écriture progressive)
Vérifier que l'appel API utilise `stream: true` côté SDK Anthropic.
Vérifier que le frontend ne buffer pas la réponse avant rendu.
Les chunks SSE doivent être rendus immédiatement dans le DOM.

Si le streaming fonctionne déjà côté backend mais que l'affichage 
est en bloc : corriger le frontend pour rendre chaque chunk reçu 
immédiatement.

### B2. Curseur clignotant pendant l'écriture
Pendant le streaming, afficher un curseur "▍" à la fin du texte 
en cours, qui clignote.
- Animation CSS : opacity 1 → 0 → 1, durée 1s, infinite
- Disparaît quand isStreaming = false

### B3. Auto-scroll pendant la génération
Pendant le streaming, scroller automatiquement vers le bas pour 
suivre le texte qui s'écrit.
Pattern : 
- Détecter si l'utilisateur a scrollé manuellement vers le haut
- Si oui : désactiver l'auto-scroll
- Si l'utilisateur revient en bas : réactiver l'auto-scroll
Variable d'état : `isAutoScrollEnabled` (true par défaut, 
false dès que scroll utilisateur détecté).

### B4. Bouton "Stop" — changement de couleur
Le bouton Stop (déjà existant) qui apparaît pendant la génération 
est actuellement rouge.
Changer pour une couleur cohérente avec l'app :
- Soit gris foncé (#374151) avec icône blanche
- Soit le bleu accent app avec opacity réduite
Choisir l'option la plus lisible et cohérente.
Pas de rouge.

---

## SECTION C — Actions sur messages

### C1. Actions hover sur message IA
Au hover sur un message IA, faire apparaître une barre d'actions 
discrète en bas du message :
- Bouton Copier (icône clipboard, 14px)
- Bouton Régénérer la réponse (icône refresh, 14px)
- Bouton Pouce haut (feedback positif, 14px)
- Bouton Pouce bas (feedback négatif, 14px)

Style :
- Icônes monochromes gris (#6B7280)
- Fond transparent au repos
- Hover sur chaque icône : fond gris très clair #F3F4F6, 
  border-radius 6px, padding 4px
- Espacement entre icônes : 4px
- Apparition : opacity 0 → 1, transition 150ms

Le feedback (pouce) doit être sauvegardé en Supabase 
(créer table `ai_message_feedback` si nécessaire avec 
message_id, user_id, rating: 'up' | 'down', created_at).

### C2. Indicateur du modèle utilisé
Sous chaque message IA, à droite de la barre d'actions hover, 
afficher discrètement :
- Texte 11px, gris clair #9CA3AF
- Format : "Athèna" / "Hermès" / "Zeus" selon le modèle utilisé 
  pour générer cette réponse spécifique
Stocker le nom du modèle utilisé avec chaque message en Supabase 
si pas déjà fait.

### C3. Édition d'un message utilisateur déjà envoyé
Au hover sur un message utilisateur (bulle bleue) :
- Afficher une icône "crayon" (edit) en haut à droite de la bulle, 
  ou juste à côté, taille 14px, gris clair
- Au clic : la bulle se transforme en textarea éditable avec le 
  contenu actuel
- Boutons "Annuler" (texte) et "Renvoyer" (bleu) en dessous
- Au "Renvoyer" : 
  * Mettre à jour le message en base
  * Supprimer toutes les réponses suivantes de cette conversation
  * Régénérer une nouvelle réponse IA à partir du message édité

### C4. Timestamps au hover
Au hover sur n'importe quel message (user ou IA), afficher discrètement 
le timestamp à côté du message :
- Format : "14:32" si aujourd'hui, "Hier 14:32" si hier, 
  "12 mai 14:32" sinon
- Position : à droite du message (user) ou sous le message (IA)
- Taille 10px, gris très clair, opacity 0 → 0.7 au hover

---

## SECTION D — État vide et avatars

### D1. État vide nouvelle conversation
Quand une nouvelle conversation est ouverte (pas encore de messages) :
- Centrer verticalement dans la zone de chat
- Logo shuriken du modèle IA actif, taille 48px, animation subtile 
  au mount (fade-in + scale 0.9 → 1, durée 400ms)
- Sous le logo, message d'accueil :
  - "Bonjour, [bon matin / après-midi / soir]" selon l'heure
  - Sous-titre : "Comment puis-je t'aider aujourd'hui ?"
- En dessous, les "Actions rapides" existantes en grille

### D2. Avatars
Devant chaque message utilisateur (côté droit avant la bulle) :
- Cercle 28px avec les initiales de l'utilisateur (récupérées du 
  profil Supabase)
- Fond : gris clair, texte gris foncé, font-weight 500
- Si pas d'initiales : icône "user" générique

Devant chaque message IA (déjà fait) : logo du modèle, 20px.
S'assurer que les deux ont la même position verticale et le même 
espacement par rapport au texte.

---

## SECTION E — Markdown et code

### E1. Tableaux
- Border : 1px solid #E5E7EB
- Header : fond #F9FAFB, font-weight 600
- Cellules : padding 8px 12px
- Border-collapse : collapse
- Bordures internes fines

### E2. Blocs de code (```code```)
- Fond #F6F8FA
- Border-radius 8px
- Padding 12px 16px
- Font monospace (ui-monospace, SF Mono, Menlo)
- Taille 13px
- Au hover du bloc : afficher en haut à droite un bouton "Copier" 
  (icône clipboard) qui copie le contenu du bloc dans le clipboard
- Feedback visuel au clic : icône check pendant 1.5s puis retour
- Si le bloc indique un langage (```python) : afficher le nom du 
  langage en haut à gauche, petite taille, gris clair

### E3. Code inline (`code`)
- Fond #F3F4F6
- Padding 2px 6px
- Border-radius 4px
- Font monospace, taille 13px
- Couleur texte légèrement différente

### E4. Listes imbriquées
S'assurer que l'indentation est correcte et lisible.
Espacement vertical entre items : 4px.

### E5. Citations (blockquote)
- Border-left 3px solid #D1D5DB
- Padding-left 16px
- Texte italique
- Couleur gris foncé

---

## SECTION F — Recherche et raccourcis

### F1. Recherche dans la sidebar
Ajouter un champ de recherche en haut de la sidebar, sous l'en-tête 
"CONVERSATIONS" :
- Input texte, placeholder "Rechercher..."
- Icône loupe à gauche dans l'input
- Style cohérent avec les autres inputs de l'app
- Filtre la liste des conversations en temps réel sur le titre

### F2. Raccourcis clavier
Implémenter :
- Cmd/Ctrl + K : nouvelle conversation
- Cmd/Ctrl + Entrée : envoyer le message
- Échap : fermer le panneau Coach IA
- Cmd/Ctrl + F : focus sur la recherche conversations

Ne pas afficher la liste des raccourcis à l'écran sauf si demandé 
plus tard. Les implémenter en silence.

---

## SECTION G — Gestion erreurs et features avancées

### G1. Gestion erreurs API
Quand l'appel à l'API IA échoue (timeout, rate limit, erreur réseau) :
Afficher un message d'erreur élégant dans le chat à la place de la 
réponse IA :
- Cadre rouge clair (fond #FEF2F2, border #FCA5A5)
- Icône alerte
- Message clair selon le type d'erreur :
  * Timeout : "La réponse prend trop de temps. Réessaie."
  * Rate limit : "Trop de requêtes. Patiente quelques secondes."
  * Erreur réseau : "Problème de connexion. Vérifie ta connexion."
  * Autre : "Une erreur est survenue. Réessaie."
- Bouton "Réessayer" qui relance la dernière requête

### G2. Export conversation
Dans le header ou via les actions au hover sur une conversation 
dans la sidebar :
- Bouton "Exporter" → menu : Markdown / PDF
- Markdown : génère un .md avec tous les messages 
  (format "## User\n...\n\n## Athèna\n...")
  Téléchargement direct.
- PDF : génère un PDF via une librairie (jspdf ou react-pdf) avec 
  mise en forme propre (titres, messages alternés, dates)
  Téléchargement direct.

### G3. Épingler une conversation
Au hover sur une conversation dans la sidebar :
- En plus de renommer/supprimer (déjà existants), ajouter une icône 
  "épingle" (pin)
- Au clic : marque la conversation comme épinglée en base
- Les conversations épinglées remontent en haut de la liste 
  (section "Épinglées" séparée)
- Petite icône épingle visible à gauche du titre des conversations 
  épinglées
Ajouter colonne `is_pinned` (boolean, default false) à la table 
des conversations si pas déjà présente.

---

## Ordre d'exécution recommandé
1. Section A (visuel pur, rapide)
2. Section B (streaming + comportements)
3. Section C (actions messages)
4. Section D (état vide + avatars)
5. Section E (markdown)
6. Section F (recherche + raccourcis)
7. Section G (erreurs + export + épingle)

Valider le build après chaque section. Si erreur de compilation, 
corriger avant de passer à la suivante.
