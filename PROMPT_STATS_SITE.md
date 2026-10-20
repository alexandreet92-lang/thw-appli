Écrire dans PROMPT_STATS_SITE.md à la racine, puis implémenter.

# Statistiques du site (admin uniquement)

- Table `site_hits` (migration 20261022_site_stats.sql, RLS sans policy) alimentée par `/api/t` (service role). Sans cookie, IP jamais stockée, empreinte journalière salée, bots et Do Not Track ignorés.
- Tracker `public/site/stats.js` (toutes les pages du site + /defi) ; événements test_start / test_step / test_done dans Forme et Decaform ; `app_open` / `signup` côté app (ClientShell), vérifiés côté serveur.
- Agrégats serveur `src/lib/stats/siteStats.ts`, API `/api/admin/stats`, page `/admin/statistiques` (garde checkAdmin + middleware 403), lien « Statistiques » dans Mon compte via `/api/admin/me`.
- 5 onglets : Vue d'ensemble, Trafic, Tests, Rétention, Partenaires QR. SVG brut, libellés fr/en/es/it/de, politique de confidentialité mise à jour.
