# Connexions — Intégrer les vrais logos

## Problème
La majorité des apps affichent un carré coloré avec des initiales 
au lieu du vrai logo de la marque.

## Solution
Pour chaque app listée ci-dessous, récupérer le logo officiel 
depuis une source fiable.

Méthode : utiliser les favicons/logos publics via l'URL 
https://logo.clearbit.com/[domaine] ou télécharger depuis 
les sites officiels.

Stocker tous les logos dans public/logos/apps/

Liste complète des logos à intégrer :

### Entraînement
- wahoo.png → logo.clearbit.com/wahoofitness.com
- polar.png → logo.clearbit.com/polar.com
- suunto.png → logo.clearbit.com/suunto.com
- coros.png → logo.clearbit.com/coros.com
- zwift.png → logo.clearbit.com/zwift.com
- rouvy.png → logo.clearbit.com/rouvy.com
- mywhoosh.png → logo.clearbit.com/mywhoosh.com

### Récupération & Santé
- whoop.png → logo.clearbit.com/whoop.com
- oura.png → logo.clearbit.com/ouraring.com
- hrv4training.png → logo.clearbit.com/hrv4training.com
- elitehrv.png → logo.clearbit.com/elitehrv.com
- welltory.png → logo.clearbit.com/welltory.com
- applehealth.png → logo.clearbit.com/apple.com
- googlefit.png → logo.clearbit.com/google.com
- samsunghealth.png → logo.clearbit.com/samsung.com

### Balance & Corps
- withings.png → logo.clearbit.com/withings.com
- fitbit.png → logo.clearbit.com/fitbit.com
- zepp.png → logo.clearbit.com/zepp.com
- renpho.png → logo.clearbit.com/renpho.com
- eufy.png → logo.clearbit.com/eufylife.com
- tanita.png → logo.clearbit.com/tanita.com
- omron.png → logo.clearbit.com/omron.com

### Nutrition
- myfitnesspal.png → logo.clearbit.com/myfitnesspal.com
- cronometer.png → logo.clearbit.com/cronometer.com
- yazio.png → logo.clearbit.com/yazio.com
- lifesum.png → logo.clearbit.com/lifesum.com
- macrofactor.png → logo.clearbit.com/macrofactor.com
- carbondi.png → logo.clearbit.com/carbondietcoach.com

### Biométrie & Capteurs
- stryd.png → logo.clearbit.com/stryd.com
- core.png → logo.clearbit.com/corebodytemp.com
- supersapiens.png → logo.clearbit.com/supersapiens.com
- levels.png → logo.clearbit.com/levelshealth.com
- dexcom.png → logo.clearbit.com/dexcom.com
- abbott.png → logo.clearbit.com/abbott.com

### Sommeil
- sleepcycle.png → logo.clearbit.com/sleepcycle.com
- pillow.png → logo.clearbit.com/pillow.app (ou nap.is)
- autosleep.png → logo.clearbit.com/autosleep.app

## Implémentation
Pour chaque app dans le composant de la page Connexions :
- Remplacer le fallback carré+initiales par <Image src="/logos/apps/[nom].png" />
- Garder le fallback initiales UNIQUEMENT si l'image ne charge pas
- Taille : 40×40px, border-radius 10px, object-fit contain
- Fond blanc derrière le logo pour cohérence

Si clearbit ne fonctionne pas pour certains domaines : 
garder le fallback initiales pour ceux-là, on les ajoutera 
manuellement plus tard.
