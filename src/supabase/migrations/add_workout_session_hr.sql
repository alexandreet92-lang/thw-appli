-- FC min/max de la séance in-app (avg_hr existe déjà). Alimenté par le capteur
-- BLE connecté pendant la séance (Web Bluetooth — Android/Chrome ou app native).
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS max_hr integer,
  ADD COLUMN IF NOT EXISTS min_hr integer;
