# CALENDAR — Onglet All : restaurer la vue Verticale

## Contexte
La vue Verticale a été supprimée par erreur lors d'une implémentation précédente.
La restaurer. Ne pas réintroduire la vue Horizontale.

## État cible
Onglet All = deux vues uniquement :
- Verticale (active par défaut)
- Circulaire (existante, ne pas y toucher)

Toggle en haut à droite : "↕ Vertical" | "◎ Circulaire"

## Vue Verticale — specs
Reprendre l'implémentation qui existait avant suppression.
Si le code n'est plus présent, la reconstruire ainsi :

Liste scrollable, groupée par mois (headers : FÉV, AVR, MAI...).
Chaque événement sur une ligne :
- Point coloré à gauche
- Badge catégorie : RACE (rouge) / PRO (bleu) / PERSO (violet)
- Badge niveau : Principal / Important / Secondaire / GTY
- Abréviation sport (RUN / BIK / TRI / HYR / SWI / ROW)
- Nom de l'événement
- Countdown en jours à droite (rouge <7j, orange <30j, vert sinon)
- Si passé : "Passé" en gris + checkmark
- Fond de ligne légèrement coloré selon catégorie

Données : merger races + Pro + Perso, filtrées par 
user_id = auth.uid() et année en cours, triées par date.
