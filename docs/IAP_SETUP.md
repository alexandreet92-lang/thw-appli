# Achat in-app (RevenueCat + Apple) — configuration

Le code côté app + serveur est en place. Il reste **ta** configuration Apple + RevenueCat.
Le web reste sur Stripe ; l'IAP ne concerne que l'app iOS.

## 1. App Store Connect — créer les produits
App Store Connect → ton app **Hybrid** → « Achats intégrés » et « Abonnements ».
Utilise EXACTEMENT ces identifiants (le code s'appuie dessus).

### Abonnements athlète (groupe d'abonnements « athlete »)
| Identifiant | Prix mensuel / annuel |
|---|---|
| `athlete_premium_monthly` / `athlete_premium_yearly` | 14€ / 132€ |
| `athlete_pro_monthly` / `athlete_pro_yearly` | 29€ / 249€ |
| `athlete_expert_monthly` / `athlete_expert_yearly` | 49€ / 468€ |

### Abonnements coach (groupe « coach »)
| Identifiant | Prix mensuel / annuel |
|---|---|
| `coach_solo_monthly` / `_yearly` | 29€ / 290€ |
| `coach_team_monthly` / `_yearly` | 59€ / 590€ |
| `coach_club_monthly` / `_yearly` | 99€ / 990€ |
| `coach_academy_monthly` / `_yearly` | 169€ / 1690€ |
| `coach_elite_monthly` / `_yearly` | 229€ / 2290€ |
| `coach_federation_monthly` / `_yearly` | 349€ / 3490€ |

### Coach : option athlète INTÉGRÉE au pack (même groupe d'abonnements)
Identifiant : `coach_<solo|team|club>[_<pro|expert>]_<monthly|yearly>` — sans suffixe = sans option (premium).
Exemples : `coach_solo_monthly`, `coach_solo_pro_monthly`, `coach_team_expert_yearly`.
Les paliers Académie / Élite / Fédération (et `coach_club_pro_yearly`, `coach_club_expert_yearly`) dépassent le
plafond Apple (~1000 €) : web / sur mesure uniquement, non créés sur iOS.

### Tokens (produits consommables)
| `tokens_100k` 4€ · `tokens_500k` 15€ · `tokens_1m` 25€ |

> Essai gratuit : configure une « offre d'introduction » (14 jours gratuits) sur les abonnements si tu veux garder l'essai.
> Pense aux contrats Paid Apps (banque + fiscalité) sinon les produits restent en « Missing Metadata ».

## 2. RevenueCat
1. Crée un compte gratuit sur revenuecat.com → nouveau **Project** → ajoute une app **App Store**, colle l'**App-Specific Shared Secret** (App Store Connect → ton app → App Information).
2. **Products** : importe les 23 identifiants ci-dessus.
3. **Entitlements** (facultatif côté serveur, mais recommandé) : peu importe le nom, le déblocage réel se fait via notre webhook.
4. **API keys** : copie la clé publique **Apple** (`appl_…`).
5. **Integrations → Webhooks** : ajoute un webhook :
   - URL : `https://thw-appli.vercel.app/api/revenuecat/webhook`
   - Authorization header : une valeur secrète que tu choisis (ex. une longue chaîne aléatoire).

## 3. Variables d'environnement
- **Vercel** (serveur) : `REVENUECAT_WEBHOOK_SECRET` = la valeur du header Authorization ci-dessus.
- **App iOS** (`scripts/build-cap.mjs`, section env) : `NEXT_PUBLIC_REVENUECAT_IOS_KEY` = la clé publique Apple `appl_…`.
  (À ajouter aussi dans Vercel pour le web, sans effet mais évite les warnings.)

## 4. Build iOS
`npm run cap:sync` puis dans Xcode : le plugin `@revenuecat/purchases-capacitor` est intégré automatiquement (pod).
Test en **sandbox** (compte de test App Store Connect → Utilisateurs et accès → Testeurs Sandbox).

## Ce que fait le code déjà en place
- `src/lib/iap/products.ts` : mapping identifiant → accès.
- `src/app/api/revenuecat/webhook/route.ts` : débloque tier / crédite tokens (miroir du webhook Stripe), idempotent.
- `src/lib/subscriptions/check-quota.ts` : accorde le tier sur un abonnement Apple actif.
- `src/lib/iap/purchases.ts` : `initIap`, `iapPrices`, `buyIap`, `restoreIap` (iOS natif).
- `src/components/iap/IapStoreHost.tsx` : boutique in-app (abonnement athlète, pack coach + option, tokens, restauration, mentions Apple), ouverte par `openIapStore(tab)`.
- Migration `20260929_iap_store_columns.sql` : colonnes `store` / `provider_sub_id` + table `iap_events` (déjà appliquée en prod).

## Reste à faire
- Déployer (`[deploy]`) pour publier le webhook, puis test bout-en-bout en sandbox (achat → webhook → déblocage).
