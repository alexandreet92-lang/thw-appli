# Réponses sur la table de marge par pack coach

> Document de réponse aux 5 questions posées sur la table de marge du 13/09/2026.
> **Résumé en une phrase : cette table couvre uniquement le coût IA, à la consommation
> maximale du quota, et repose sur des estimations — aucune mesure réelle.**

---

## 1. Le coût prend en compte quoi exactement ?

**Uniquement l'IA.** Rien d'autre.

### Ce qui EST compté

| Poste | Fournisseur | Détail |
|---|---|---|
| Modèles de langage | Anthropic | Haiku 4.5, Sonnet 4.6, Opus 4.8 |
| Synthèse vocale (TTS) | OpenAI | `gpt-4o-mini-tts` |
| Transcription (STT) | OpenAI | `gpt-4o-mini-transcribe` |
| Recherche web | Anthropic | outil `web_search` des briefings |

### Ce qui n'est PAS compté

| Poste | Impact sur la marge | Remarque |
|---|---|---|
| **Commission Stripe** | **Variable, par coach** | ~1,5 % + 0,25 € par transaction (carte EEA). Sur un pack Fédération à 389 € : **~6 €/mois**. Sur un Solo à 29 € : ~0,70 €. À vérifier sur ton tableau de bord. |
| Supabase | Fixe, mutualisé | Base, auth, stockage. Le stockage monte avec le nombre d'utilisateurs (photos d'activités, uploads). |
| Vercel | Fixe + variable | Hébergement. Les routes IA ont `maxDuration` jusqu'à 300 s — les fonctions longues sont facturées au temps d'exécution. |
| Resend | Fixe, faible | Emails transactionnels. |
| Mapbox | Variable | Fonds de carte, facturés à la vue. Monte avec l'usage, pas avec le nombre de coachs. |
| **LiveKit** | **Variable, potentiellement notable** | Canaux vocaux de la communauté (Pro/Expert). Facturé à la minute de participant. Non mesuré à ce jour. |
| OpenRouteService, SerpAPI, Google CSE, Spoonacular | Variable, faible | Itinéraires, recherche, base alimentaire. |
| Nom de domaine, comptes développeur Apple / Google | Fixe, annuel | ~100–200 €/an au total. |
| Strava, Polar, Garmin | **Gratuit** | APIs partenaires sans frais d'usage. |

**La seule de ces lignes qui change la table de façon significative, c'est Stripe**, parce qu'elle est proportionnelle au prix payé. Les autres sont des coûts de plateforme mutualisés entre tous les utilisateurs : ils ne s'imputent pas proprement « par coach » tant qu'on ne connaît pas le nombre total d'utilisateurs.

### La table corrigée de la commission Stripe

| Pack | Formule | Prix | Coût IA | Stripe (~1,5 % + 0,25 €) | Total | Marge |
|---|---|---|---|---|---|---|
| Solo | Premium | 29 € | 4 € | 0,7 € | 4,7 € | 84 % |
| Solo | Expert | 69 € | 17 € | 1,3 € | 18,3 € | 73 % |
| Club | Expert | 139 € | 27 € | 2,3 € | 29,3 € | 79 % |
| Élite | Expert | 269 € | 54 € | 4,3 € | 58,3 € | 78 % |
| Fédération | Expert | 389 € | 81 € | 6,1 € | 87,1 € | 78 % |

La marge reste autour de 78–84 %. **Il manque quand même les coûts de plateforme** (Supabase, Vercel, LiveKit…), que je ne peux pas chiffrer sans tes factures.

---

## 2. Usage moyen ou usage maximum ?

**Usage maximum.** C'est un plafond, pas une prévision.

La table suppose que le coach consomme **100 % de son quota chat toutes les semaines** et **100 % de son quota Studio tous les mois**, douze mois sur douze.

Dans la réalité, un utilisateur qui sature systématiquement son quota est un cas extrême. Une répartition plus plausible :

| Profil | Part du quota consommée | Coût réel (Fédération Expert) |
|---|---|---|
| Coach occasionnel | 10–20 % | 8–16 € |
| Coach régulier | 30–50 % | 24–41 € |
| Coach intensif | 70–100 % | 57–81 € |

**Le chiffre de la table, c'est le pire cas.** C'est volontaire : je voulais te donner le plancher de marge garanti, pas une moyenne optimiste.

**Précision importante :** ce coût est celui du **coach lui-même**. Les athlètes qu'il coache paient leur propre abonnement et consomment leur propre quota — leur usage IA n'est pas dans cette table.

---

## 3. Quelles sont les hypothèses de calcul ?

### Je n'ai PAS raisonné en « appels IA par athlète »

C'est important, parce que c'est probablement ce que tu attendais. Je n'ai posé aucune hypothèse du type « X analyses par athlète par mois ».

J'ai fait l'inverse : **je suis parti des plafonds de tokens définis dans ton code**, en supposant qu'ils sont atteints, puis je les ai convertis en euros. Le nombre d'appels n'intervient jamais — seul compte le volume total de tokens, qui est plafonné quoi qu'il arrive.

### Étape 1 — Les quotas (lus dans le code)

**Chat** — `src/lib/tokens/limits.ts`, fenêtre glissante de 7 jours, en tokens *pondérés* :

| Formule | Par semaine | × 30/7 = par mois |
|---|---|---|
| Premium | 175 000 | 750 000 |
| Pro | 700 000 | 3 000 000 |
| Expert | 2 000 000 | 8 570 000 |

**Studio** — `src/lib/subscriptions/coach-packs.ts`, quota mensuel : 1 M à 25 M selon le pack (voir question 4).

### Étape 2 — Les multiplicateurs (`src/lib/tokens/multipliers.ts`)

Un « token pondéré » n'est pas un token réel. Ton code applique un multiplicateur par modèle :

| Modèle interne | Modèle réel | Multiplicateur |
|---|---|---|
| Hermès | Haiku 4.5 | ×1 |
| Athéna | Sonnet 4.6 | ×3 |
| Zeus | Opus 4.8 | ×6 |

### Étape 3 — Les tarifs API (vérifiés, septembre 2026)

| Modèle | Entrée ($/M tokens) | Sortie ($/M tokens) |
|---|---|---|
| Haiku 4.5 | 1 $ | 5 $ |
| Sonnet 4.6 | 3 $ | 15 $ |
| Opus 4.8 | 5 $ | 25 $ |

**Ces multiplicateurs sont bien calibrés** — c'est une qualité de ton système, pas un hasard. Quel que soit le modèle, un token pondéré coûte la même chose :

- Entrée : 1 ÷ 1 = 1 $ · 3 ÷ 3 = 1 $ · 5 ÷ 6 = 0,83 $ → **~1 $ / M pondéré**
- Sortie : 5 ÷ 1 = 5 $ · 15 ÷ 3 = 5 $ · 25 ÷ 6 = 4,17 $ → **~5 $ / M pondéré**

C'est ce qui rend le calcul possible sans savoir quel modèle sera utilisé.

### Étape 4 — Le mix entrée/sortie (← **c'est mon hypothèse, pas une mesure**)

Le coût dépend de la proportion entre texte lu et texte produit. J'ai supposé :

| Usage | Mix supposé | Coût par M pondéré | Justification |
|---|---|---|---|
| Chat | 80 % entrée / 20 % sortie | 1,80 $ | Boucle agentique : gros contexte injecté, réponses courtes |
| Studio | 50 % / 50 % | 3,00 $ | Chaque nœud produit un rendu complet, plus de génération |

**C'est le point le plus fragile de tout le calcul.** Si le vrai mix est 60/40 sur le chat, le coût monte de 1,80 $ à 2,60 $ par million, soit +44 %.

### Étape 5 — Conversion

Taux utilisé : **0,9 € pour 1 $**.

### Le calcul complet, sur l'exemple Fédération Expert

```
Chat   : 2 000 000 pondérés/semaine × 30/7 = 8 570 000/mois
         8,57 M × 1,80 $ = 15,4 $ → 13,9 €

Studio : 25 000 000 pondérés/mois
         25 M × 3,00 $ = 75,0 $ → 67,5 €

TOTAL  : 81,4 € (hors Stripe et hors plateforme)
```

---

## 4. Combien d'athlètes par pack ?

**Le nombre d'athlètes n'entre dans le calcul qu'à un seul endroit : le quota Studio.** Il n'a aucun effet sur le coût du chat.

J'ai pris **la capacité maximale du pack**, pas une moyenne réaliste :

| Pack | Athlètes supposés | Quota Studio (50 000 × athlètes, plancher 1 M) |
|---|---|---|
| Solo | 10 | 1 000 000 (plancher) |
| Équipe | 50 | 2 500 000 |
| Club | 100 | 5 000 000 |
| Académie | 200 | 10 000 000 |
| Élite | 300 | 15 000 000 |
| Fédération | 500 | 25 000 000 |

### Ce que ça implique

**Le coût affiché est pessimiste deux fois de suite :**

1. Le coach est supposé avoir **rempli son pack** (500 athlètes sur Fédération). Un coach qui vient de passer à Fédération avec 60 athlètes ne consommera jamais 25 M.
2. Il est supposé **utiliser tout son quota** (question 2).

Un coach Fédération avec 60 athlètes et un usage normal te coûtera plus probablement **10 à 20 €/mois** que 81 €.

**À noter :** le quota Studio est attribué selon le *pack*, pas selon le nombre d'athlètes réellement liés. Un coach qui prend Fédération avec 10 athlètes obtient quand même 25 M de quota. Il ne les consommera pas — mais rien ne l'en empêche techniquement. Si tu veux fermer ça un jour, il faudrait indexer le quota sur le nombre d'athlètes réels plutôt que sur la capacité du pack.

---

## 5. Vraies mesures ou estimations ?

**Estimations. Aucune mesure réelle.** Zéro.

La raison est simple et c'est le sujet de tout ce chantier : **jusqu'au 12 septembre 2026, la consommation n'était pas mesurée.** 18 routes IA appelaient les modèles sans rien enregistrer. Il n'existe donc aucun historique exploitable.

### Ce qui est vérifié

| Élément | Source | Fiabilité |
|---|---|---|
| Tarifs API Anthropic | Documentation officielle | ✅ Vérifié |
| Tarifs OpenAI TTS/STT | Recherche web, sept. 2026 | ✅ Vérifié |
| Commission Stripe EEA | Documentation Stripe | ✅ Vérifié |
| Quotas par plan | `src/lib/tokens/limits.ts` | ✅ Lu dans le code |
| Multiplicateurs ×1/×3/×6 | `src/lib/tokens/multipliers.ts` | ✅ Lu dans le code |
| Quotas Studio par pack | `src/lib/subscriptions/coach-packs.ts` | ✅ Lu dans le code |

### Ce qui est supposé

| Élément | Valeur retenue | Risque |
|---|---|---|
| **Mix entrée/sortie** | 80/20 chat, 50/50 Studio | ⚠️ **Le plus incertain.** Peut faire varier le total de ±40 % |
| **Coût d'un nœud Studio** | 4k / 10k / 22k tokens pondérés | ⚠️ Ce sont **tes propres estimations**, écrites dans `offers.ts` avec le commentaire « ordre de grandeur observé ». Je n'ai fait que les reprendre — elles n'ont pas été validées non plus. |
| Consommation à 100 % du quota | Oui | ⚠️ Pessimiste (voir question 2) |
| Pack rempli à capacité maximale | Oui | ⚠️ Pessimiste (voir question 4) |
| Taux de change | 0,9 €/$ | ⚠️ Faible impact, fluctue |

### Dans quel sens l'erreur va-t-elle ?

Mon avis, à défaut de preuve : **le chiffre réel sera plus bas.** Deux raisons.

- Les deux hypothèses de saturation (quota plein + pack plein) sont volontairement les pires cas.
- Le *prompt caching* d'Anthropic divise le coût des parties répétées du contexte par 10. Le compteur en tient déjà compte, mais dans une boucle agentique l'effet est souvent plus fort que ce que j'ai supposé.

Le seul point qui pourrait le faire monter, c'est si le mix réel penche davantage vers la génération que je ne l'ai estimé.

### Quand auras-tu les vrais chiffres ?

Le compteur tourne depuis le 12 septembre 2026. **Sous un mois**, ton cockpit admin (`/admin`) affichera la consommation réelle par modèle et par utilisateur.

Deux choses à vérifier à ce moment-là :

1. **Le mix entrée/sortie réel** — la table `token_usage` enregistre `raw_tokens` par appel ; en croisant avec la facture Anthropic on retrouve le mix exact.
2. **Le coût réel d'un run Studio** — pour valider ou corriger les 4k / 10k / 22k de `offers.ts`.

Avec ces deux mesures, la table de marge devient un vrai chiffre au lieu d'une estimation.

---

## Résumé

| Question | Réponse courte |
|---|---|
| 1. Périmètre du coût | **IA uniquement.** Ni Supabase, ni Vercel, ni Stripe, ni LiveKit, ni domaine |
| 2. Usage retenu | **Maximum** (100 % du quota, tous les mois) |
| 3. Hypothèses | Plafonds de tokens du code → mix entrée/sortie supposé → tarifs API vérifiés → 0,9 €/$ |
| 4. Athlètes par pack | **Capacité maximale** du pack (10 / 50 / 100 / 200 / 300 / 500) |
| 5. Nature des chiffres | **Estimations.** Zéro mesure — rien n'était compté avant le 12/09/2026 |

**Ce qu'il faut en retenir :** la marge de ~78 % est un *plancher estimé*, pas une prévision. Elle est solide sur la partie IA (les plafonds sont désormais appliqués, donc le pire cas est borné), mais elle ne dit rien de ta rentabilité globale tant que les coûts de plateforme ne sont pas chiffrés.

---

*Document rédigé le 13/09/2026. À réviser dès que le cockpit admin affichera un mois complet de consommation réelle.*

**Sources externes :** [Tarifs Anthropic](https://docs.anthropic.com/en/docs/about-claude/pricing) · [Tarifs OpenAI TTS](https://costgoat.com/pricing/openai-tts) · [Tarifs OpenAI transcription](https://costgoat.com/pricing/openai-transcription) · [Commissions Stripe par pays](https://globalfeecalculator.com/blog/stripe-fees-by-country/)
