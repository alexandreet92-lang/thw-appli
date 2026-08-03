# PROMPT V2 — Corrections de l'analyse de coût (THW Coaching)

> Suite du brief `PROMPT_COUTS.md`. Ce fichier consigne les **corrections** apportées à `ANALYSE_COUTS.md`
> après revue critique. 3 failles corrigées + 2 vérifications.

## Failles corrigées

**FAILLE 1 — web_search / TTS dans ou hors du plafond de tokens ?**
Contradiction V1 : « le budget de tokens est un plafond fiable » ET « web_search/TTS sont hors budget ».
→ Vérifier dans le code le *gating* réel de `web_search` et de `/api/tts`. Si hors budget, calculer le coût
**pire cas** web_search + TTS par utilisateur/mois (nb max de recherches et de synthèses vocales déclenchables).
C'est le vrai risque de coût **non plafonné**.

**FAILLE 2 — le 82–92 % est-il AVANT ou APRÈS ces coûts ?**
Dire « marge réelle 82–92 % *meilleure* que 70–80 % à cause de coûts oubliés » est incohérent (ajouter des coûts
*baisse* la marge). → Clarifier : le chiffre inclut-il OUI/NON web_search + TTS + Stripe ? Recalculer marge
typique ET pire cas **tous coûts inclus**. Si c'est plutôt ~72 %, le dire.

**FAILLE 3 — « packs tokens jamais négatifs, mathématiquement impossible »**
Faux si la consommation d'un pack déclenche web_search/TTS (coûts hors budget). → Retirer « impossible »,
donner le scénario de dégradation.

## Vérifications

**VÉRIF 1 — plafond micro-entreprise.** 77 700 € est périmé (≤2025). Plafond **2026–2028 BNC/prestations de
services = 83 600 €**. Recalculer le nombre d'abonnés. Seuil TVA reste **37 500 €**.

**VÉRIF 2 — prix API : source + date par modèle réellement câblé.** Référence officielle **au 2 août 2026** :
Opus 5 = 5 $/25 $ · Sonnet 5 = 2 $/10 $ (promo jusqu'au 31/08, puis 3 $/15 $ au 01/09) · Haiku 4.5 = 1 $/5 $ ·
Fable 5 = 10 $/50 $. → Vérifier les prix utilisés en V1 ; traiter deux alertes :
1. un agent sur **Sonnet** → marge −50 % au 01/09 (fin promo) ?
2. un agent basculé sur **Fable 5** (10× Haiku) → multiplicateur pondéré ×6 = vente à perte ?
Dire lesquels sont **réels vu le code actuel**.

## Livrable
Mettre à jour `ANALYSE_COUTS.md` : marge réelle **tous coûts inclus** (typique + pire cas) par tier, coût
pire cas **web_search + TTS** par user, plafond micro corrigé en nb d'abonnés, **tableau de sensibilité au prix
des modèles**. Signaler les données manquantes à mesurer.
