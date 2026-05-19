# UI — Corrections globales

## ⚠️ Contrainte
Beaucoup de corrections. Exécuter section par section.
Valider le build entre chaque.

---

## SECTION A — Navbar

### A1. Logo app → à droite du hamburger, pas centré
Le logo app (squircle cyan→bleu) est actuellement centré dans la 
navbar avec le texte "THW Coaching" à côté.
- Déplacer le logo à GAUCHE, juste à droite du hamburger
- Supprimer le texte "THW Coaching" de la navbar
- Espacement : hamburger (gauche) → 8px → logo app (36×36px)

### A2. Hamburger — pas de bulle
Les 3 traits du hamburger sont actuellement dans un cercle/bulle 
gris foncé. Supprimer le fond/bordure du bouton hamburger.
Garder juste les 3 traits, couleur texte standard, sans conteneur.

### A3. Logo IA en haut à droite — nouveau logo
Remplacer l'ancien logo IA (bleu uni) par le nouveau 
logo_gradient_4bras.png (dégradé cyan→bleu).
Vérifier dans public/logos/ que le fichier est bien le nouveau.
Taille : 36×36px.

### A4. Photo de profil
Ajouter la photo de profil de l'utilisateur à droite dans la navbar,
entre le logo IA et le bord droit.
- Récupérer l'avatar depuis Supabase auth (user.user_metadata.avatar_url)
  ou depuis la table profil utilisateur
- Taille : 32×32px, border-radius 50% (cercle)
- Si pas de photo : cercle avec initiales (fond gris, texte blanc)
- Cliquable → lien vers la page Profil
- Ordre dans la navbar de gauche à droite :
  Hamburger → Logo app → [espace flexible] → Logo IA → Photo profil

---

## SECTION B — Interface IA

### B1. Logos des modèles — mettre les nouveaux
Vérifier que les fichiers dans public/logos/ sont bien les 
versions gradient (cyan→bleu). Si ce sont encore les anciens 
(bleu uni), les remplacer.
Vérifier chaque endroit où les logos apparaissent :
- Sélecteur de modèle
- Messages IA
- Actions rapides
- Animation chargement

### B2. Champ d'écriture — style Claude
Desktop uniquement (≥ 768px) :
- Réduire la hauteur du champ input (padding vertical 8px → 6px)
- Supprimer la ligne/bordure au-dessus du champ input
- Supprimer le fond gris de la zone input
- Le champ doit être "flottant" en bas, comme sur Claude :
  pas de séparateur visuel entre le chat et l'input
- Border du champ : 1px solid gris très clair, border-radius 16px
- Le champ grandit si le texte est multiligne (auto-resize)

Mobile (< 768px) : ne pas changer le champ, garder tel quel.

### B3. Bouton vocal (speech-to-text)
Ajouter un bouton microphone à droite du champ input, 
à côté du bouton envoyer.

Au repos :
- Icône microphone (outline, gris moyen, 20px)
- Fond transparent

Au clic (enregistrement) :
- L'icône passe en bleu accent
- Afficher une barre d'animation sous le champ ou dans le champ :
  pattern de points/ondes animés + compteur "0:01, 0:02..."
- Bouton X à gauche pour annuler
- Bouton ✓ (bleu) à droite pour valider

Quand l'utilisateur valide :
- Utiliser l'API Web Speech (navigator.mediaDevices.getUserMedia 
  + SpeechRecognition API ou Whisper si disponible)
- Transcrire la voix en texte
- Insérer le texte dans le champ input
- L'utilisateur peut éditer avant d'envoyer

Si le navigateur ne supporte pas SpeechRecognition :
masquer le bouton microphone.

### B4. Animation "IA réfléchit" — style Claude
Quand l'IA est en train de constituer sa réponse (avant le 
streaming), remplacer l'animation statique actuelle par une 
animation dynamique comme Claude :

- Le logo du modèle IA s'affiche
- En dessous : texte animé qui change :
  "Analyse en cours..."
  "Croisement de tes données..."
  "Construction de la réponse..."
  (rotation toutes les 2 secondes, fade-in/fade-out)
- Petite barre de progression indéterminée (shimmer) ou 
  cercle de chargement animé (comme Image 3 fournie)
- L'ensemble pulse légèrement (scale 0.98 → 1.02, 2s, infinite)

Quand le streaming commence : l'animation disparaît et le texte 
apparaît progressivement (comportement existant).

---

## SECTION C — Page Connexions mobile

### C1. Fix bug d'affichage
La page Connexions est complètement cassée sur mobile :
les cartes d'apps sont des rectangles bleus/violets géants 
qui prennent tout l'écran.

Déboguer :
- Vérifier les styles CSS des cartes d'apps sur mobile
- Probablement un problème de width/height en % qui explose 
  ou un background-color appliqué au mauvais élément
- Les cartes doivent être des lignes horizontales simples 
  (logo + nom + statut + bouton) sur mobile aussi
- Supprimer tout width/height fixe en px sur mobile
- Tester sur viewport 375px de large

### C2. Layout mobile Connexions
Sur mobile :
- Masquer la sidebar catégories (menu hamburger à la place, 
  ou tabs scrollables horizontalement en haut)
- Chaque carte d'app : pleine largeur, hauteur auto
- Logo app 36px, nom 14px, description masquée, 
  statut + bouton alignés à droite
- Le bouton "Synchroniser tout" : pleine largeur, 
  pas trop grand (hauteur 40px)
