# Conformité marque Strava (Brand Guidelines)

Éléments mis en place dans le code pour satisfaire les exigences de marque
Strava, prérequis à l'augmentation de quota API (voir `docs/STRAVA_QUOTA.md`).

## Composant unique de branding

`src/components/strava/StravaBranding.tsx` expose 3 composants réutilisables :

| Composant | Rôle | Règle Strava |
|-----------|------|--------------|
| `ConnectWithStrava` | Bouton orange officiel « Connect with Strava » | Bouton de connexion obligatoire |
| `PoweredByStrava` | Badge d'attribution « Powered by Strava » | Sur toute vue affichant des données Strava |
| `ViewOnStrava` | Lien vers `strava.com/activities/{id}` | Lien retour vers l'activité source |

Les libellés (« Connect with Strava », « Powered by Strava », « View on
Strava ») et l'orange `#FC4C02` sont volontairement **en dur** : ce sont des
marques déposées qui ne doivent être ni traduites ni modifiées.

## Où c'est branché

- **Bouton connexion** : `src/components/strava/StravaConnect.tsx` (état non
  connecté → `ConnectWithStrava`).
- **Attribution** : widget Strava connecté + en-tête du détail d'activité
  (mobile et desktop) dans `src/app/activities/page.tsx`.
- **View on Strava** : en-tête du détail d'activité, affiché uniquement quand
  `activity.provider === 'strava'` et `activity.provider_id` présent.

## Étape manuelle recommandée avant la revue Strava

Le logo utilisé est la **marque angulaire officielle Strava** (chevrons) + le
wordmark en texte. Pour un rendu 100 % pixel-perfect, télécharger les lockups
officiels depuis le **Strava Brand Center** et les déposer dans
`public/strava/`, puis remplacer le rendu texte du wordmark par le SVG officiel
dans `StravaBranding.tsx`. Non bloquant, mais soigne l'impression lors de la
revue.

## À faire si de nouvelles surfaces affichent des données Strava

Toute nouvelle page/vue qui montre des activités importées de Strava doit
inclure `<PoweredByStrava />` et, pour chaque activité, un `<ViewOnStrava />`
quand l'ID source est disponible.
