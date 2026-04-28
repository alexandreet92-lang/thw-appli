-- Migration: add 'ski' to activities_sport_type_check constraint
-- Covers: AlpineSki, BackcountrySki, NordicSki, Snowboard, Snowshoe, RollerSki, IceSkate, InlineSkate
ALTER TABLE activities DROP CONSTRAINT activities_sport_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_sport_type_check
  CHECK (sport_type = ANY (ARRAY[
    'run', 'trail_run', 'bike', 'virtual_bike',
    'swim', 'open_water_swim',
    'rowing', 'hyrox', 'triathlon', 'duathlon', 'aquathlon',
    'gym', 'crossfit', 'hiit', 'yoga',
    'ski',
    'other'
  ]));
