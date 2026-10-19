Écrire dans PROMPT_MON_COMPTE.md à la racine, puis implémenter.

# Mon compte (public/site/compte.html)

- Profil : photo (POST /api/account/avatar, bucket avatars), membre depuis, formule.
- Cartes : abonnement (prochain paiement, moyen de paiement réel), tokens chat, tokens Studio ("Illimité" si valeur sentinelle >= 1e12).
- Consommation mensuelle chat + Studio sur 12 mois (GET /api/account/overview : token_usage + studio_usage), ancienneté.
- Téléphone flottant avec 4 écrans (aperçu, données fictives étiquetées aperçu).
- Factures chronologiques groupées par année (Stripe via /api/subscription/details). Prix masqués si ?app=1.
- Pas de blocs sans backend réel (2FA, parrainage, connexions) : liens vers l app.
