# CALENDAR — Améliorations UI

## 1. Bulles d'événement dans MonthlyView

### Fix bug hover
Le popover disparaît après 1/4 de seconde car le mouseLeave 
se déclenche quand la souris passe sur le popover lui-même.
Corriger avec un délai de fermeture (150ms) annulé si la souris 
entre dans le popover. Pattern classique :
- onMouseLeave sur la bulle : setTimeout(close, 150) → stocker l'id
- onMouseEnter sur le popover : clearTimeout(id)
- onMouseLeave sur le popover : setTimeout(close, 150)

### Design des bulles
Agrandir les barres d'événement dans MonthlyView :
- Hauteur : 24px (au lieu de la hauteur actuelle)
- Border-radius : 6px
- Padding horizontal : 8px
- Texte : 11px, font-weight 500
- Courses (races) : fond coloré selon niveau avec opacité 0.15, 
  bordure gauche 3px solide couleur pleine, texte couleur pleine
  (même code couleur que vue annuelle : rouge/orange/vert/noir)
- Événements/stages : fond bleu pâle, bordure gauche 3px bleu, 
  texte bleu
- Ajouter une ombre légère : box-shadow 0 1px 3px rgba(0,0,0,0.1)

## 2. Bouton Supprimer dans DayModal
Ajouter un bouton "Supprimer" à gauche de "Fermer" dans DayModal.
Style : texte rouge, fond transparent, bordure rouge fine.
Au clic : confirmation ("Supprimer ce jour et son fichier ?") 
puis supprimer :
- L'entrée dans daily_program pour cette date
- Le fichier dans race_event_files pour cet event_id + event_date
- Le fichier dans Supabase Storage
Fermer le modal après suppression et rafraîchir la vue.

## 3. Vue Verticale All — refonte design

### Structure de chaque ligne
Remplacer les lignes plates actuelles par des cartes légères :
- Background blanc, border-radius 8px
- Bordure gauche 3px colorée (rouge RACE, bleu PRO, violet PERSO)
- Padding 12px 16px
- Légère ombre : box-shadow 0 1px 4px rgba(0,0,0,0.06)
- Espacement entre cartes : 6px

### Contenu de chaque carte
Ligne principale :
- Gauche : nom de l'événement (font-weight 600, 14px) + 
  badge sport (RUN/BIK/TRI etc., 10px, fond gris clair, 
  border-radius 4px, padding 2px 6px)
- Droite : countdown "J-20" (font-weight 700, 15px, 
  couleur selon urgence : rouge <7j, orange <30j, gris sinon)

Ligne secondaire (sous le nom) :
- Date complète (ex: "dimanche 7 juin") + badge niveau 
  (Principal/Important/Secondaire/GTY) en petit, gris moyen

Headers de mois : uppercase, 11px, gris, font-weight 700, 
margin-top 20px, avec le count à droite.

### Hover sur une carte
Au hover : légère élévation (box-shadow plus prononcée + 
translateY(-1px), transition 150ms).
Curseur pointer.

### Clic sur une carte
Au clic sur une carte dans la vue verticale :
Ouvrir un panneau latéral (drawer) ou modal de détail selon 
ce qui est le plus cohérent avec le design existant.

Contenu du détail selon le type :

RACE :
- Nom + date + sport + niveau
- Distance et objectif de temps
- Allure/watts calculés (si disponibles)
- Classement cible
- Stratégie nutritionnelle (si renseignée)
- Parcours GPX (carte + profil altimétrique) si fichier présent
- Notes

PRO / PERSO :
- Nom + date + description
- Données spécifiques selon le schéma existant

Bouton "Modifier" dans le détail → ouvre le modal d'édition correspondant.
