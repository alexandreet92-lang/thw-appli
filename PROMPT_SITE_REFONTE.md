# PROMPT_SITE_REFONTE — refonte du site marketing (public/site/)

Changements livrés :
- Accueil = ancienne page « Découvrir » (index.html). decouvrir.html redirige vers index.html.
- Bouton « Liste » des 21 piliers corrigé (cartes révélées après bascule).
- Tests : Decaform en carte vedette, puis « Adultes et seniors » et « Enfants et ados » (CadencesTests.jsx).
- Barre du haut : Accueil, Decaform (+ Mon historique si connecté). « Plans » et « Connexion » retirés (Plans reste dans le pied de page / menu).
- « Se connecter » ouvre une fenêtre modale sur ordinateur (> 820 px), reste une page sur mobile.
- Connecté : bulle de compte (thème jour/nuit/auto, langue, changer le mot de passe, déconnexion).
- Mot de passe oublié : POST /api/auth/site-reset-password. Changement : POST /api/auth/site-password.
- Google/Apple : en cas d'échec on revient sur la page d'origine ; signout honore ?next=.
- Langues IT et DE : i18n-it.js / i18n-de.js chargés à la demande par i18n.js ; i18n-dict-11.js = nouveaux textes (EN/ES).

À vérifier côté Supabase : Redirect URLs doit contenir https://www.the-hybridway.com/auth/callback (et le domaine nu), providers Google et Apple activés.
