# Coach IA — Animation pendant la réponse

## Contexte
Quand l'utilisateur envoie un message au Coach IA, un indicateur de 
chargement s'affiche (actuellement un éclair violet avec "..." à côté).

## 1. Remplacer l'éclair par le logo du modèle IA actif
L'indicateur doit afficher le logo correspondant au modèle IA 
sélectionné (Hermès / Athèna / Zeus) :
- Hermès → /logos/logo_3bras.png
- Athèna → /logos/logo_4bras.png
- Zeus → /logos/logo_6bras.png

Taille : 24px × 24px.
Supprimer l'ancien éclair violet et son fond.
Garder l'indicateur "..." à côté du logo.

## 2. Animation de rotation pendant la génération
Le logo doit être animé pendant toute la durée de la réponse 
de l'IA (du moment où l'utilisateur envoie son message jusqu'à 
la fin du streaming de la réponse).

Cycle d'animation :
- Rotation : 2 tours complets sur lui-même (720°)
- Durée d'un cycle : 2 secondes
- Easing : ease-in-out (départ doux, milieu rapide, arrêt doux — 
  PAS de rotation linéaire, ce serait brusque)
- Pause : 1,5 seconde immobile
- Le cycle se répète tant que l'IA répond

Le tout doit être fluide et naturel, comme un mécanisme qui 
prend de la vitesse, tourne, ralentit, marque une pause, recommence.

## 3. Implémentation technique
Utiliser CSS keyframes avec animation-iteration-count: infinite.
Exemple de structure :

@keyframes spin-pause {
  0%   { transform: rotate(0deg); }
  57%  { transform: rotate(720deg); }   /* fin de rotation à 57% du cycle */
  100% { transform: rotate(720deg); }   /* pause sur les 43% restants */
}

.ai-loading-logo {
  animation: spin-pause 3.5s ease-in-out infinite;
  transform-origin: center center;
}

Ajuster les pourcentages pour obtenir exactement 2s rotation + 1,5s pause.

L'animation démarre quand isLoading/isStreaming = true.
L'animation s'arrête quand isLoading/isStreaming = false 
(le composant disparaît à ce moment).
