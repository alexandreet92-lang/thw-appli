-- ══════════════════════════════════════════════════════════════════════════
-- Refonte des canaux de l'espace THW Communauté : structure plus claire, fidèle
-- à l'identité « hybride » (endurance + force). #général conservé.
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare sid uuid;
begin
  select id into sid from public.community_spaces where slug = 'thw-communaute';
  if sid is null then return; end if;

  delete from public.community_channels
  where space_id = sid and name in ('technique', 'nutrition', 'compétitions');

  update public.community_channels set position = 2, topic = 'Discussions libres'
  where space_id = sid and name = 'général';

  insert into public.community_channels (space_id, name, topic, position, kind)
  select sid, c.name, c.topic, c.position, 'text'
  from (values
    ('accueil',       'Présente-toi et découvre l''espace',                  0),
    ('annonces',      'Actus & nouveautés THW',                              1),
    ('hybride',       'Concilier endurance + force — le cœur du Hybrid Way', 3),
    ('endurance',     'Course, trail, vélo, cardio',                         4),
    ('force',         'Renfo, muscu, développé de la force',                 5),
    ('nutrition',     'Alimentation, compléments, hydratation',              6),
    ('récupération',  'Sommeil, mobilité, prévention des blessures',         7),
    ('progrès',       'Partage tes séances, activités et records',           8),
    ('objectifs',     'Compétitions, défis et préparation',                  9)
  ) as c(name, topic, position)
  where not exists (
    select 1 from public.community_channels x where x.space_id = sid and x.name = c.name
  );
end $$;
