# Export de parcours vers les appareils (Garmin, Wahoo…)

Objectif : qu'un parcours créé dans THW Coaching **apparaisse directement sur le
compteur / la montre** de l'utilisateur (comme le fait Garmin Connect), sans
passer par un téléchargement GPX manuel.

## État des lieux (juillet 2026)

| Service | Push d'itinéraire vers l'appareil | Ce qu'il faut |
|---------|-----------------------------------|---------------|
| **Garmin** | ✅ Possible (Training API → « Courses ») | Partenariat **Garmin Connect Developer Program** + Consumer Key/Secret (OAuth 1.0a) |
| **Wahoo** | ✅ Possible (Cloud API → `routes`) | Application approuvée **Wahoo Cloud API** + scope d'écriture (OAuth 2.0) |
| **Strava** | ❌ Pas d'API publique de création d'itinéraire | — |
| **Polar** | ❌ Pas de push d'itinéraire (AccessLink lecture seule) | — |
| **Coros / Suunto** | ⚠️ Pas d'API publique de courses | — |

Tant qu'on n'a pas les accès, la voie **qui marche partout aujourd'hui** est
l'**export GPX** (déjà en place, menu ⋯ d'un parcours → « Exporter (GPX) »).

---

## B. Obtenir l'accès — démarche côté THW (à faire par toi)

### Garmin — Connect Developer Program

1. Va sur **developer.garmin.com** → « Connect Developer Program » → **Request Access**.
2. Formulaire à remplir (points clés) :
   - **Nom de l'app** : THW Coaching.
   - **Type d'app** : coaching / entraînement multisport.
   - **API demandée** : ⚠️ **Training API** (c'est elle qui permet d'**envoyer des Courses/itinéraires** vers Garmin Connect → l'appareil). *(La Health API et l'Activity API servent à LIRE des données — pas nécessaires pour l'export d'itinéraire.)*
   - **Cas d'usage** : « L'utilisateur crée un itinéraire dans notre app ; nous voulons le pousser dans son compte Garmin Connect pour qu'il se synchronise sur son appareil (Edge, Forerunner, Fenix…). »
   - **Volume estimé d'utilisateurs / de requêtes**.
   - **URL de callback OAuth** : `https://<domaine-prod>/api/oauth/garmin/callback`.
3. Garmin valide manuellement (compter **plusieurs semaines**). À l'approbation tu reçois un **Consumer Key** et un **Consumer Secret**.
4. Garmin utilise **OAuth 1.0a** (pas 2.0) — signatures HMAC-SHA1. Le flux est déjà prévu côté code (voir §A).

### Wahoo — Cloud API

1. **developers.wahooligan.com** → créer une application.
2. Demander les scopes d'écriture (routes) — peut nécessiter une validation.
3. On récupère `WAHOO_CLIENT_ID` / `WAHOO_CLIENT_SECRET` (déjà partiellement en place : Wahoo est un connecteur existant, mais en **lecture seule** — il faudra **élargir le scope**).

---

## A. Intégration côté code — ce qui est déjà en place (squelette)

Tout est câblé pour **s'activer automatiquement dès que les clés sont présentes** :

- **`src/lib/deviceProviders.ts`** — registre des fournisseurs « push appareil »
  (Garmin, Wahoo), avec détection des variables d'environnement (activé / non
  activé). Un provider sans clés = **désactivé**, invisible dans l'UI.
- **`GET /api/routes/push-to-device`** — renvoie la liste des providers
  **activés** (clés présentes) et **connectés** (l'utilisateur a lié son compte).
- **`POST /api/routes/push-to-device`** — reçoit `{ routeId, provider }`,
  charge le parcours, vérifie le token OAuth de l'utilisateur, et pousse le
  parcours vers le service. **La dernière étape (appel API signé) se termine
  une fois les clés obtenues** — voir les `TODO` dans le fichier.
- **UI** — le menu ⋯ d'un parcours affiche « Envoyer vers Garmin / Wahoo »
  **uniquement** quand le provider est activé et connecté. Aujourd'hui : rien
  ne s'affiche (pas de bouton mort), l'export GPX reste la voie active.

### Variables d'environnement à ajouter (Vercel) après approbation

```
# Garmin (OAuth 1.0a — Training API)
GARMIN_CONSUMER_KEY=...
GARMIN_CONSUMER_SECRET=...
GARMIN_REDIRECT_URI=https://<domaine>/api/oauth/garmin/callback

# Wahoo (OAuth 2.0 — Cloud API, scope écriture)
WAHOO_CLIENT_ID=...
WAHOO_CLIENT_SECRET=...
```

Dès que ces variables sont là, l'option « Envoyer vers l'appareil » apparaît et
il ne reste qu'à finaliser l'appel API (fonction `pushCourse`) contre le schéma
exact du provider — tout le reste (OAuth, tokens, chargement du parcours,
construction du tracé) est déjà fait.

---

## Pourquoi pas de « hack » non officiel ?

Il existe des bibliothèques qui parlent à l'API web **non publique** de Garmin
Connect. On ne les utilise **pas** : contraires aux CGU Garmin, cassées à chaque
mise à jour, et risque de bannissement du compte utilisateur. On reste sur la
voie officielle (partenariat) + GPX en attendant.
