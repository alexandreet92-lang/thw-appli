-- ══════════════════════════════════════════════════════════════════════════
-- Communauté — modèle « à la Discord » : un seul espace officiel par défaut.
-- On retire les espaces sport officiels (Running, Cycling, Hyrox, Gym) ; les
-- groupes se découvrent et se rejoignent via la recherche. Seul THW Communauté
-- reste comme espace « maison » (auto-rejoint côté client à la 1re visite).
-- Cascade : canaux / membres / messages des espaces supprimés sont retirés.
-- ══════════════════════════════════════════════════════════════════════════
delete from public.community_spaces
where kind = 'official' and slug in ('running', 'cycling', 'hyrox', 'gym');
