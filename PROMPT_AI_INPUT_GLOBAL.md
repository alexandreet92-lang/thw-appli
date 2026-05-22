# Interface IA — Champ d'écriture unifié pour tous les modèles

## Problème
Le nouveau champ d'écriture (style Claude, auto-expand, bouton 
vocal, animation 3 points) n'est appliqué que sur un seul modèle 
ou une seule vue.

Il doit être identique sur TOUTE l'interface Hybrid Training 
quel que soit le modèle sélectionné (Hermès, Athèna, Zeus).

## Ce qu'il faut faire

1. Identifier le composant du champ d'écriture.
   Il doit être un composant UNIQUE et PARTAGÉ.

2. Vérifier qu'il n'existe pas plusieurs composants input dupliqués.

3. Si le composant existe en plusieurs versions : 
   supprimer les doublons et utiliser UN SEUL composant partout.

4. Ce composant unique doit inclure :
   - Textarea auto-expand (grandit avec le texte)
   - Border-radius 24px, fond gris clair, pas de border-top
   - Font-size 16px
   - Boutons intégrés : [+] [texte] [Modèle ∨] [🎤] [➤]
   - Bouton vocal (speech-to-text)
   - Animation 3 points rebondissants pendant le chargement

5. Vérifier que ce composant est utilisé dans :
   - La vue chat principale
   - L'état vide (nouvelle conversation)
   - Le mode plein écran
   - La version mobile

6. Changement de modèle : le champ input NE DOIT PAS se recharger.
