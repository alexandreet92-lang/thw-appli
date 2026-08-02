# PROMPT — Analyse de coût réel & marge par abonnement (THW Coaching)

> Ce fichier consigne le **brief d'analyse** exécuté. Le résultat chiffré est dans `ANALYSE_COUTS.md`.
> But : reproductibilité. Toute personne (ou agent) qui relance cette analyse doit repartir de ce prompt,
> re-sourcer les tarifs à jour, et recalculer à partir de la **logique réelle du code** (pas d'exemples fictifs).

## Objectif

Calculer le **coût réel complet** et la **marge par type d'abonnement**, à partir de la logique réelle de
l'application (quotas de tokens, modèles appelés, règles d'allocation trouvés dans le code — pas d'hypothèses inventées).

Trois questions finales :
1. À chaque niveau d'abonnement, le prix de vente couvre-t-il le coût avec une marge saine ?
2. La marge réelle calculée correspond-elle à la marge annoncée de **70–80 %** ? Expliquer tout écart.
3. À partir de quel volume les charges réelles franchissent **34 % du CA** (bascule micro-entreprise → société)
   et où se situe le **seuil de TVA (37 500 € de CA/an)** ?

## Périmètre de l'offre (à confronter au code)

1. **Abonnements ATHLÈTES** — 3 niveaux : Premium 14 € · Pro 26 € · Expert 49 € (par mois).
   Le coût IA croît avec le niveau (plus de tokens et/ou modèle plus coûteux). Trouver dans le code :
   le **quota de tokens par tier** et **quel modèle** (Hermès/Athéna/Zeus = Haiku/Sonnet/Opus) est appelé.
2. **Abonnements COACH** — 6 packs. Coût IA de base identique ; des **options** (tier athlète inclus) donnent
   plus de tokens → surcoût. Identifier ces options dans le code.
3. **Packs TOKENS rechargeables** — revenu ET coût API. Comparer le prix de vente au coût API réel des
   tokens débloqués : marge positive, nulle ou négative ?

## Méthode (6 étapes)

- **Étape 1 — Cartographie des appels IA** : pour chaque agent / déclencheur (génération de séance, plan,
  nutrition, chat coaching, briefing, marketing, TTS…), noter modèle appelé, taille input/output, tier/pack,
  fréquence. Séparer **Opus / Sonnet / Haiku** (prix par million très différents). Sourcer les tarifs Anthropic à jour.
- **Étape 2 — Séparer BUILD (dev) et RUN (production)** :
  - *Coûts de construction* = liés au développement, indépendants du nombre d'utilisateurs (ex : Vercel qui
    monte à 70–80 €/mois en dev actif) → **ne pas** imputer au coût par utilisateur.
  - *Coûts de run* = ce que coûte l'app en fonctionnement pour servir les utilisateurs.
- **Étape 3 — Inventaire exhaustif** : OVH (domaine), Vercel, Supabase (paliers), Apple Developer, Stripe,
  emails, monitoring, analytics, API tierces (Strava, Polar, Instagram, Mapbox, OpenRouteService, OpenAI TTS,
  Anthropic web_search), stockage, CDN. Sourcer chaque prix.
- **Étape 4 — Coût & marge par tier** : pour chaque tier athlète, l'offre coach de base, chaque option coach,
  chaque pack token → coût variable **pire cas** (quota consommé à 100 % sur le modèle le plus coûteux),
  prix de vente, marge en € et en %. Signaler tout produit à marge faible/négative.
- **Étape 5 — Sensibilité** : impact sur la marge si une tâche Sonnet passe sur Opus ; points où une hausse
  des prix API ou une montée en gamme de modèle fait passer un produit sous un seuil de rentabilité.
- **Étape 6 — Modèle global & verdict** : paliers 100 / 500 / 1000 / 3000 abonnés (mix entre tiers paramétrable).
  Pour chaque palier : CA, coûts de run variables, coûts fixes de production, marge nette, **ratio coûts/CA %**.
  Indiquer le palier où le ratio franchit 34 %, celui où le CA franchit 37 500 €, et l'écart avec la marge
  annoncée 70–80 %.

## Contraintes

- Se baser sur la **logique réelle du code** ; citer les fichiers et valeurs utilisés.
- Ne **deviner aucun prix** : sourcer tous les tarifs (Anthropic, OpenAI, Vercel, Supabase, OVH, Apple, Stripe, Mapbox…).
- Là où les **vrais volumes** sont inconnus (taux de consommation des quotas, mix réel entre tiers, factures
  Supabase/Vercel/OpenAI), le dire explicitement et lister ce qu'il faut mesurer dans les factures et logs.
- Donner des **fourchettes**, pas de fausse précision.
