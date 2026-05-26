# PROMPT_HIKING_VTT_ROWING

## 3 sports : Randonnée, VTT, Aviron

### SPORT 1 — RANDONNÉE (GPS, copie Trail)
- Architecture exacte Trail
- Accent : #22C55E
- Pages : Données (big=durée) / Carte / Dénivelé
- Athlete : FC max, FC repos, Vitesse marche (km/h)
- Alerts : pas de pente dangereuse, ajouter rappel photo (0/15/30/60 min)
- Types : balade / randonnée / trek / nordic / recup
- Table : hiking_settings / sport_page_configs sport='hiking'

### SPORT 2 — VTT (GPS, copie Cyclisme)
- Architecture exacte Cycling + éléments Trail pour la pente
- Accent : #F97316
- Pages : Données / Carte+terrain / Dénivelé / Lap (4 pages)
- Terrain badge sur Page 2 (detectTrailType)
- Athlete : FTP, FC max, FC repos
- Alerts : ajouter alerte pente dangereuse (comme Trail)
- Sensors : supprimer vitesse roue
- Types : enduro / xco / ef / montée / descente / long / recup
- Table : mtb_settings / sport_page_configs sport='mtb'

### SPORT 3 — AVIRON (saisie manuelle, copie Swimming)
- Pas de GPS, saisie manuelle uniquement
- Accent : #06B6D4
- Types de pratique : indoor / sculling / sweep / kayak / canoe
- Durée H/M/S + Distance en m ou km
- Calcul split 500m + watts (2.8 × (500/split)³)
- Séries avec split/watts individuels
- Types : ef / seuil / fraction / longue / piste / recup
- Table : workout_sessions (rowing_type, split_500m_seconds, avg_watts, rowing_pieces)

### SQL MIGRATION
```sql
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS rowing_type text,
  ADD COLUMN IF NOT EXISTS split_500m_seconds numeric(6,1),
  ADD COLUMN IF NOT EXISTS avg_watts integer,
  ADD COLUMN IF NOT EXISTS rowing_pieces jsonb;
```
