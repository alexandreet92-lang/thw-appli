-- Tests personnalisés : protocole complet (objectif, conditions, échauffement,
-- étapes, interprétation, erreurs, fréquence) stocké en JSONB. L'athlète décrit
-- son test comme une vraie fiche du catalogue. RLS owner-only déjà en place.
alter table public.custom_tests add column if not exists protocol jsonb;
comment on column public.custom_tests.protocol is 'Protocole complet du test personnalisé: {objectif, conditions[], echauffement[], etapes[], interpretation[], erreurs[], frequence}';
