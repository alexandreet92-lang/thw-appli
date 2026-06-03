# Inventaire technique complet de l'app THW Coaching

## Objectif
Produire `DOCUMENTATION_APP.md` à la racine : inventaire EXHAUSTIF de tout ce
qui est **réellement implémenté** dans le code (pas de « à venir »/inventé).
Base de référence pour rédiger ensuite les pages explicatives du site.

## Règle absolue
Ne lister que le code réellement présent. Marquer ✅ implémenté, ⚠️ partiel
(préciser ce qui manque), 🚧 stub vu dans le code mais non implémenté.
Aucune modification de code — lecture + documentation uniquement.

## Structure (15 sections)
1. Vue d'ensemble · 2. Architecture des pages · 3. Auth · 4. Coach IA
(modèles, agents, compétences, recherche web, actions rapides, mémoire/règles)
· 5. Tokens (quotas, packs, flow, multiplicateurs) · 6. Abonnements (plans,
essai, paiement, compte créateur) · 7. Détail des pages principales · 8.
Intégrations externes (Strava/Polar/Wahoo/Withings) · 9. Notifications · 10.
Tables Supabase · 11. Routes API · 12. Variables d'env · 13. Branding/thème ·
14. Sécurité/RGPD · 15. Build/déploiement.

## Méthodo
Lister app/ + components/, lire les pages clés, lister migrations + tables
Supabase, package.json, ENV référencées, routes app/api/*, configs.

## Livrable
`DOCUMENTATION_APP.md` + commit « docs: technical inventory of the app » +
résumé final (sections bien documentées, zones d'ombre, questions au PO).
